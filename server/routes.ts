import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import { insertLinkSchema } from "@shared/schema";

// Parse device info from user agent
function parseUserAgent(userAgent: string | undefined) {
  if (!userAgent) return { device: "Unknown", browser: "Unknown", os: "Unknown" };
  
  // Simple parsing logic - in a real application, use a proper user-agent parser library
  const device = userAgent.match(/Mobile|Android|iPhone|iPad|iPod/i)
    ? userAgent.match(/iPad/i)
      ? "Tablet"
      : "Mobile"
    : "Desktop";
    
  const browser = userAgent.match(/Chrome/i)
    ? "Chrome"
    : userAgent.match(/Firefox/i)
    ? "Firefox"
    : userAgent.match(/Safari/i)
    ? "Safari"
    : userAgent.match(/Edge/i)
    ? "Edge"
    : userAgent.match(/MSIE|Trident/i)
    ? "Internet Explorer"
    : "Unknown";
    
  const os = userAgent.match(/Windows/i)
    ? "Windows"
    : userAgent.match(/Mac/i)
    ? "Mac"
    : userAgent.match(/Linux/i)
    ? "Linux"
    : userAgent.match(/Android/i)
    ? "Android"
    : userAgent.match(/iOS/i)
    ? "iOS"
    : "Unknown";
    
  return { device, browser, os };
}

// Authentication check middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);

  // Create short URL
  app.post("/api/links", isAuthenticated, async (req, res) => {
    try {
      const { originalUrl, customAlias, expiresAt } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      if (!originalUrl) {
        return res.status(400).json({ message: "Original URL is required" });
      }
      
      // Validate URL
      try {
        new URL(originalUrl);
      } catch (err) {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      
      // Validate the rest of the input using zod schema
      const validatedData = insertLinkSchema.parse({
        userId,
        originalUrl,
        customAlias: customAlias || undefined,
        expiresAt: expiresAt || undefined
      });
      
      const useCustomAlias = !!customAlias;
      const link = await storage.createLink(validatedData, useCustomAlias);
      
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });

  // Get all links for the current user
  app.get("/api/links", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const links = await storage.getLinks(userId);
      
      // Calculate if links are expired or expiring soon
      const now = new Date();
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(now.getDate() + 7);
      
      const linksWithStatus = links.map(link => {
        const isExpired = link.expiresAt !== null && link.expiresAt < now;
        const isExpiringSoon = !isExpired && link.expiresAt !== null && link.expiresAt <= oneWeekFromNow;
        
        return {
          ...link,
          isExpired,
          isExpiringSoon
        };
      });
      
      res.json(linksWithStatus);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while fetching links" });
    }
  });

  // Get dashboard statistics
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while fetching dashboard stats" });
    }
  });

  // Get link details with analytics
  app.get("/api/links/:id", isAuthenticated, async (req, res) => {
    try {
      const linkId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const links = await storage.getLinks(userId);
      const link = links.find(l => l.id === linkId);
      
      if (!link) {
        return res.status(404).json({ message: "Link not found" });
      }
      
      // Get analytics data
      const clickStats = await storage.getClickStats(linkId);
      const deviceStats = await storage.getDeviceStats(linkId);
      
      // Calculate if link is expired or expiring soon
      const now = new Date();
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(now.getDate() + 7);
      
      const isExpired = link.expiresAt !== null && link.expiresAt < now;
      const isExpiringSoon = !isExpired && link.expiresAt !== null && link.expiresAt <= oneWeekFromNow;
      
      res.json({
        ...link,
        isExpired,
        isExpiringSoon,
        clickStats,
        deviceStats
      });
    } catch (error) {
      res.status(500).json({ message: "An error occurred while fetching link details" });
    }
  });

  // Delete a link
  app.delete("/api/links/:id", isAuthenticated, async (req, res) => {
    try {
      const linkId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const success = await storage.deleteLink(linkId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Link not found or not owned by user" });
      }
      
      res.status(200).json({ message: "Link deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "An error occurred while deleting the link" });
    }
  });

  // Handle short URL redirect
  app.get("/r/:shortCode", async (req, res) => {
    try {
      const { shortCode } = req.params;
      
      // Find the link by short code
      const link = await storage.getLinkByShortCode(shortCode);
      
      if (!link) {
        return res.status(404).json({ message: "Link not found" });
      }
      
      // Check if link has expired
      const now = new Date();
      if (link.expiresAt && link.expiresAt < now) {
        return res.status(410).json({ message: "This link has expired" });
      }
      
      // Log click asynchronously
      const { device, browser, os } = parseUserAgent(req.headers["user-agent"]);
      
      // Get client IP - handle proxies
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const ipAddress = typeof ip === 'string' ? ip.split(',')[0].trim() : undefined;
      
      // Create click record
      storage.createClick({
        linkId: link.id,
        ipAddress: ipAddress || null,
        userAgent: req.headers["user-agent"] || null,
        device,
        browser,
        os,
        referrer: req.headers.referer || null,
        country: null, // Would require IP geolocation service
      }).catch(err => console.error("Failed to log click:", err));
      
      // Increment click count
      storage.incrementLinkClickCount(link.id)
        .catch(err => console.error("Failed to increment click count:", err));
      
      // Redirect to the original URL
      res.redirect(link.originalUrl);
    } catch (error) {
      console.error("Redirect error:", error);
      res.status(500).json({ message: "An error occurred during redirect" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
