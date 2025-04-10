import { users, type User, type InsertUser, links, type Link, type InsertLink, clicks, type Click, type InsertClick, type ClickStat, type DeviceStat, type LinkWithAnalytics } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { nanoid } from "nanoid";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Link methods
  createLink(link: InsertLink, useCustomAlias?: boolean): Promise<Link>;
  getLinks(userId: number): Promise<Link[]>;
  getLinkByShortCode(shortCode: string): Promise<Link | undefined>;
  incrementLinkClickCount(id: number): Promise<void>;
  deleteLink(id: number, userId: number): Promise<boolean>;
  
  // Click methods
  createClick(click: InsertClick): Promise<Click>;
  getClicksByLinkId(linkId: number): Promise<Click[]>;
  getClickStats(linkId: number): Promise<ClickStat[]>;
  getDeviceStats(linkId: number): Promise<DeviceStat[]>;
  
  // Dashboard statistics
  getDashboardStats(userId: number): Promise<{
    totalLinks: number;
    totalClicks: number;
    activeLinks: number;
    expiringLinks: number;
  }>;
  
  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private links: Map<number, Link>;
  private clicks: Map<number, Click>;
  private usernamesIndex: Map<string, number>;
  private shortCodesIndex: Map<string, number>;
  currentUserId: number;
  currentLinkId: number;
  currentClickId: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.links = new Map();
    this.clicks = new Map();
    this.usernamesIndex = new Map();
    this.shortCodesIndex = new Map();
    this.currentUserId = 1;
    this.currentLinkId = 1;
    this.currentClickId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with a sample user (intern@dacoid.com / Test123)
    this.createUser({
      username: "intern@dacoid.com",
      password: "$2b$10$q7.a51WGTmYVdFhuzCGqg.4xv9.JwySHQoQKLbcLRo/BtLPBqCq8C", // "Test123" hashed
      email: "intern@dacoid.com"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const userId = this.usernamesIndex.get(username);
    if (userId !== undefined) {
      return this.users.get(userId);
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email || null, 
      id,
      createdAt: now
    };
    this.users.set(id, user);
    this.usernamesIndex.set(user.username, id);
    return user;
  }

  // Link methods
  async createLink(link: InsertLink, useCustomAlias = false): Promise<Link> {
    const id = this.currentLinkId++;
    let shortCode = useCustomAlias && link.customAlias ? link.customAlias : nanoid(6);
    
    // Ensure short code is unique
    while (this.shortCodesIndex.has(shortCode)) {
      if (useCustomAlias && link.customAlias) {
        throw new Error("Custom alias already exists. Please choose another one.");
      }
      shortCode = nanoid(6);
    }
    
    const now = new Date();
    const newLink: Link = {
      id,
      userId: link.userId,
      originalUrl: link.originalUrl,
      shortCode,
      customAlias: link.customAlias || null,
      createdAt: now,
      expiresAt: link.expiresAt ? new Date(link.expiresAt) : null,
      clickCount: 0,
    };
    
    this.links.set(id, newLink);
    this.shortCodesIndex.set(shortCode, id);
    return newLink;
  }

  async getLinks(userId: number): Promise<Link[]> {
    return Array.from(this.links.values())
      .filter((link) => link.userId === userId)
      .sort((a, b) => {
        // Sort by createdAt descending
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async getLinkByShortCode(shortCode: string): Promise<Link | undefined> {
    const linkId = this.shortCodesIndex.get(shortCode);
    if (linkId !== undefined) {
      return this.links.get(linkId);
    }
    return undefined;
  }

  async incrementLinkClickCount(id: number): Promise<void> {
    const link = this.links.get(id);
    if (link) {
      // Handle null clickCount (shouldn't happen with proper initialization)
      link.clickCount = (link.clickCount || 0) + 1;
      this.links.set(id, link);
    }
  }

  async deleteLink(id: number, userId: number): Promise<boolean> {
    const link = this.links.get(id);
    if (!link || link.userId !== userId) {
      return false;
    }
    
    // Remove shortcode index
    this.shortCodesIndex.delete(link.shortCode);
    
    // Delete link
    this.links.delete(id);
    
    // Delete associated clicks
    // Convert entries iterator to array before iterating
    Array.from(this.clicks.entries()).forEach(([clickId, click]) => {
      if (click.linkId === id) {
        this.clicks.delete(clickId);
      }
    });
    
    return true;
  }

  // Click methods
  async createClick(click: InsertClick): Promise<Click> {
    const id = this.currentClickId++;
    const now = new Date();
    
    const newClick: Click = {
      id,
      linkId: click.linkId,
      timestamp: now,
      ipAddress: click.ipAddress || null,
      userAgent: click.userAgent || null,
      device: click.device || null,
      browser: click.browser || null,
      os: click.os || null,
      referrer: click.referrer || null,
      country: click.country || null,
    };
    
    this.clicks.set(id, newClick);
    return newClick;
  }

  async getClicksByLinkId(linkId: number): Promise<Click[]> {
    return Array.from(this.clicks.values())
      .filter((click) => click.linkId === linkId);
  }

  async getClickStats(linkId: number): Promise<ClickStat[]> {
    const clicks = await this.getClicksByLinkId(linkId);
    
    // Group clicks by day
    const clicksByDay = new Map<string, number>();
    
    // Get last 7 days
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    
    // Initialize with zero counts
    days.forEach(day => clicksByDay.set(day, 0));
    
    // Count clicks by day
    clicks.forEach(click => {
      if (click.timestamp) {
        const day = click.timestamp.toISOString().split('T')[0];
        const currentCount = clicksByDay.get(day) || 0;
        clicksByDay.set(day, currentCount + 1);
      }
    });
    
    // Convert to array
    return days.map(day => ({
      date: day,
      count: clicksByDay.get(day) || 0,
    }));
  }

  async getDeviceStats(linkId: number): Promise<DeviceStat[]> {
    const clicks = await this.getClicksByLinkId(linkId);
    
    // Count clicks by device
    const deviceCounts = new Map<string, number>();
    
    clicks.forEach(click => {
      const device = click.device || "Unknown";
      const currentCount = deviceCounts.get(device) || 0;
      deviceCounts.set(device, currentCount + 1);
    });
    
    // Calculate percentages
    const totalClicks = clicks.length;
    const stats: DeviceStat[] = [];
    
    // Extract entries to push into stats array
    deviceCounts.forEach((count, device) => {
      stats.push({
        device, 
        count,
        percentage: totalClicks > 0 ? (count / totalClicks) * 100 : 0
      });
    });
    
    return stats.sort((a, b) => b.count - a.count);
  }

  // Dashboard statistics
  async getDashboardStats(userId: number): Promise<{
    totalLinks: number;
    totalClicks: number;
    activeLinks: number;
    expiringLinks: number;
  }> {
    const userLinks = await this.getLinks(userId);
    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);
    
    let totalClicks = 0;
    let activeLinks = 0;
    let expiringLinks = 0;
    
    userLinks.forEach(link => {
      totalClicks += link.clickCount || 0;
      
      // Link is active if it's not expired
      if (!link.expiresAt || link.expiresAt > now) {
        activeLinks++;
        
        // Check if the link is expiring within 7 days
        if (link.expiresAt && link.expiresAt <= oneWeekFromNow) {
          expiringLinks++;
        }
      }
    });
    
    return {
      totalLinks: userLinks.length,
      totalClicks,
      activeLinks,
      expiringLinks,
    };
  }
}

// Import MongoDB storage and logging
import { MongoDBStorage } from './db/mongodb-storage';
import { log } from './vite';

// Create in-memory storage as fallback
const memStorage = new MemStorage();

// Always create in-memory storage first
log('Creating in-memory storage', 'storage');

// Determine if we should attempt to use MongoDB - only try if MONGODB_URI is both set AND non-empty
const shouldUseMongoDb = process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0;
let mongoStorage: MongoDBStorage | null = null;

// Try to initialize MongoDB only if a valid URI is provided
if (shouldUseMongoDb) {
  try {
    log('Initializing MongoDB storage', 'mongodb');
    mongoStorage = new MongoDBStorage();
    log('MongoDB is configured and will be used for storage if connection succeeds', 'mongodb');
  } catch (error) {
    log(`Error initializing MongoDB storage: ${error instanceof Error ? error.message : String(error)}`, 'mongodb');
    log('Falling back to in-memory storage', 'mongodb');
    mongoStorage = null;
  }
} else {
  log('No MongoDB URI provided or empty URI. Using in-memory storage only.', 'mongodb');
}

// Export the appropriate storage implementation
export const storage = mongoStorage || memStorage;

// Log information about storage choice
if (!mongoStorage) {
  log('INFO: Using in-memory storage for all data', 'mongodb');
  log('All data will be lost when the server restarts', 'mongodb');
}
