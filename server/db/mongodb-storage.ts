import { IStorage } from '../storage';
import { User, Link, Click, InsertUser, InsertLink, InsertClick, ClickStat, DeviceStat } from '@shared/schema';
import { UserModel, UserDocument } from './models/user.model';
import { LinkModel, LinkDocument } from './models/link.model';
import { ClickModel, ClickDocument } from './models/click.model';
import { connectForServerless } from './mongodb';
import { nanoid } from 'nanoid';
import { Types } from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import memorystore from 'memorystore';

/**
 * MongoDB implementation of the storage interface
 */
export class MongoDBStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // First try to initialize MongoDB session store
    try {
      // Always create a memory store as a reliable fallback we can use
      const MemoryStore = memorystore(session);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // 24 hours
      });

      // Only attempt MongoDB connection if URI is provided
      if (process.env.MONGODB_URI) {
        try {
          const connectionOptions = {
            mongoUrl: process.env.MONGODB_URI,
            collectionName: 'sessions',
            ttl: 14 * 24 * 60 * 60, // = 14 days. Default
            autoRemove: 'native' as const, // Cast as literal type
          };

          // Try creating the session store - this may fail if MongoDB is unavailable
          this.sessionStore = MongoStore.create(connectionOptions);

          // We'll test the actual connection in a non-blocking way
          // But we won't throw an error if it fails - we'll just keep the memory store
          connectForServerless()
            .then(() => {
              console.log('MongoDB connection successful, using MongoDB for sessions and data storage');
            })
            .catch(err => {
              console.error('MongoDB connection error during initialization:', err);
              console.log('Falling back to in-memory storage for data and sessions');
              this.sessionStore = new MemoryStore({
                checkPeriod: 86400000 // 24 hours
              });
            });
        } catch (mongoError) {
          console.error('Failed to initialize MongoDB session store:', mongoError);
          // We already have memory store as fallback, so no need to do anything
        }
      } else {
        console.log('No MongoDB URI provided, using in-memory session store');
      }
    } catch (error) {
      // This is a critical error if even the memory store fails
      console.error('Failed to initialize any storage:', error);
      throw error;
    }
  }

  /**
   * Convert MongoDB user document to schema User model
   */
  private mapUser(user: UserDocument): User {
    return {
      id: parseInt(user._id.toString(), 10), // Convert string ID to number
      username: user.username,
      email: user.email,
      password: user.password,
      createdAt: user.createdAt || null,
    };
  }

  /**
   * Convert MongoDB link document to schema Link model
   */
  private convertLinkToSchema(link: LinkDocument): Link {
    return {
      id: parseInt(link._id.toString(), 10), // Convert string ID to number
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      userId: link.userId.toString(), // Keep userId as string for compatibility
      createdAt: link.createdAt || null,
      expiresAt: link.expiresAt || null,
      clickCount: link.clickCount || 0,
      customAlias: link.customAlias || null,
    };
  }

  /**
   * Convert MongoDB click document to schema Click model
   */
  private convertClickToSchema(click: ClickDocument): Click {
    return {
      id: parseInt(click._id.toString(), 10), // Convert string ID to number
      linkId: parseInt(click.linkId.toString(), 10), // Convert string ID to number
      timestamp: click.timestamp || null,
      ipAddress: click.ipAddress || null,
      userAgent: click.userAgent || null,
      device: click.device || null,
      browser: click.browser || null,
      os: click.os || null,
      referrer: click.referrer || null,
      country: click.country || null,
    };
  }

  // User methods
  async getUser(id: number | string): Promise<User | null> {
    try {
      await connectForServerless();
      // If id is a MongoDB ObjectId string, use it directly
      const query = typeof id === 'string' && id.length === 24 ? 
        { _id: id } : 
        { _id: { $exists: true } };
      const user = await UserModel.findOne(query);
      if (!user) return null;
      const mappedUser = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        password: user.password,
        createdAt: user.createdAt || null
      };
      return mappedUser;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      console.log('MongoDB: Looking up user by username/email:', username);
      await connectForServerless();
      
      const user = await UserModel.findOne({
        $or: [
          { username: username },
          { email: username }
        ]
      }).exec();
      console.log('MongoDB query result:', user ? 'User found' : 'User not found');
      
      if (!user) {
        console.log('MongoDB: No user record found for username:', username);
        return null;
      }

      console.log('MongoDB: Found user:', {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        hasPassword: !!user.password
      });
      
      const mappedUser = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        password: user.password,
        createdAt: user.createdAt || null
      };
      return mappedUser;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      await connectForServerless();
      const user = await UserModel.create(userData);
      return this.mapUser(user);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Link methods
  async createLink(linkData: InsertLink, useCustomAlias = false): Promise<Link> {
    try {
      await connectForServerless();

      // Use custom alias if provided and requested, otherwise generate a short code
      let shortCode;
      if (useCustomAlias && linkData.customAlias) {
        shortCode = linkData.customAlias;

        // Check if the custom alias is already taken
        const existingLink = await LinkModel.findOne({ shortCode });
        if (existingLink) {
          throw new Error('Custom alias already in use');
        }
      } else {
        // Generate unique short code
        let isUnique = false;
        while (!isUnique) {
          shortCode = nanoid(7);
          const existing = await LinkModel.findOne({ shortCode });
          isUnique = !existing;
        }
      }

      // Create link with the short code
      const link = await LinkModel.create({
        originalUrl: linkData.originalUrl,
        customAlias: linkData.customAlias || null,
        expiresAt: linkData.expiresAt ? new Date(linkData.expiresAt) : null,
        shortCode,
        userId: new Types.ObjectId(linkData.userId.toString()),
        clickCount: 0
      });

      return this.convertLinkToSchema(link);
    } catch (error) {
      console.error('Error creating link:', error);
      throw error;
    }
  }

  async getLinks(userId: number): Promise<Link[]> {
    try {
      await connectForServerless();
      const links = await LinkModel.find({ userId: new Types.ObjectId(userId.toString()) });
      return links.map(link => this.convertLinkToSchema(link));
    } catch (error) {
      console.error('Error fetching links:', error);
      return [];
    }
  }

  async getLinkByShortCode(shortCode: string): Promise<Link | undefined> {
    try {
      await connectForServerless();
      const link = await LinkModel.findOne({ shortCode });
      return link ? this.convertLinkToSchema(link) : undefined;
    } catch (error) {
      console.error('Error fetching link by shortCode:', error);
      return undefined;
    }
  }

  async incrementLinkClickCount(id: number): Promise<void> {
    try {
      await connectForServerless();
      await LinkModel.updateOne(
        { _id: new Types.ObjectId(id.toString()) },
        { $inc: { clickCount: 1 } }
      );
    } catch (error) {
      console.error('Error incrementing link click count:', error);
    }
  }

  async deleteLink(id: number | string, userId: number | string): Promise<boolean> {
    try {
      await connectForServerless();
      
      // Find all links for the user and match by converted id
      const links = await LinkModel.find({
        userId: new Types.ObjectId(userId.toString())
      });

      // Find the link where the converted _id matches our target id
      const link = links.find(l => parseInt(l._id.toString(), 10) === parseInt(id.toString(), 10));
      
      if (!link) {
        return false;
      }

      // Now delete using the MongoDB document's _id
      const result = await LinkModel.deleteOne({ _id: link._id });

      if (result.deletedCount === 1) {
        // Also delete related clicks using the correct linkId
        await ClickModel.deleteMany({ linkId: link._id });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting link:', error);
      return false;
    }
  }

  // Click methods
  async createClick(clickData: InsertClick): Promise<Click> {
    try {
      await connectForServerless();
      const click = await ClickModel.create({
        ...clickData,
        linkId: new Types.ObjectId(clickData.linkId.toString()),
      });

      return this.convertClickToSchema(click);
    } catch (error) {
      console.error('Error creating click:', error);
      throw error;
    }
  }

  async getClicksByLinkId(linkId: number): Promise<Click[]> {
    try {
      await connectForServerless();
      const clicks = await ClickModel.find({
        linkId: new Types.ObjectId(linkId.toString()),
      });

      return clicks.map(click => this.convertClickToSchema(click));
    } catch (error) {
      console.error('Error fetching clicks:', error);
      return [];
    }
  }

  async getClickStats(linkId: number): Promise<ClickStat[]> {
    try {
      await connectForServerless();

      // MongoDB aggregation to group clicks by date
      const result = await ClickModel.aggregate([
        {
          $match: {
            linkId: new Types.ObjectId(linkId.toString()),
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { "_id": 1 }
        }
      ]);

      return result.map(item => ({
        date: item._id,
        count: item.count,
      }));
    } catch (error) {
      console.error('Error fetching click stats:', error);
      return [];
    }
  }

  async getDeviceStats(linkId: number): Promise<DeviceStat[]> {
    try {
      await connectForServerless();

      // MongoDB aggregation to count clicks by device
      const result = await ClickModel.aggregate([
        {
          $match: {
            linkId: new Types.ObjectId(linkId.toString()),
          }
        },
        {
          $group: {
            _id: "$device",
            count: { $sum: 1 }
          }
        }
      ]);

      // Calculate total for percentage
      const total = result.reduce((sum, item) => sum + item.count, 0);

      // Calculate percentage for each device
      return result.map(item => ({
        device: item._id || 'Unknown',
        count: item.count,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
      }));
    } catch (error) {
      console.error('Error fetching device stats:', error);
      return [];
    }
  }

  // Dashboard statistics
  async getDashboardStats(userId: number): Promise<{
    totalLinks: number;
    totalClicks: number;
    activeLinks: number;
    expiringLinks: number;
  }> {
    try {
      await connectForServerless();

      // Find all links by user
      const links = await LinkModel.find({
        userId: new Types.ObjectId(userId.toString()),
      });

      // Calculate statistics
      const now = new Date();
      const expirationThreshold = new Date();
      expirationThreshold.setDate(now.getDate() + 7); // Links expiring in 7 days

      const totalLinks = links.length;
      const totalClicks = links.reduce((sum, link) => sum + (link.clickCount || 0), 0);
      const activeLinks = links.filter(link => 
        (!link.expiresAt || link.expiresAt > now)
      ).length;
      const expiringLinks = links.filter(link => 
        link.expiresAt && link.expiresAt > now && link.expiresAt < expirationThreshold
      ).length;

      return {
        totalLinks,
        totalClicks,
        activeLinks,
        expiringLinks,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalLinks: 0,
        totalClicks: 0,
        activeLinks: 0,
        expiringLinks: 0,
      };
    }
  }
}