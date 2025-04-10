import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "linking-secret-session-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('Login attempt for username:', username);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log('Login failed: User not found in database -', username);
          return done(null, false, { message: "Invalid username or password" });
        }

        console.log('User found:', { id: user.id, username: user.username });
        console.log('Comparing passwords...');

        console.log('Comparing password:', password, 'with hash:', user.password);
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Detailed comparison result:', { provided: password, hashed: user.password, isValid: isPasswordValid });
        console.log('Password comparison result:', isPasswordValid);

        if (!isPasswordValid) {
          console.log('Login failed: Invalid password for user -', username);
          return done(null, false, { message: "Invalid username or password" });
        }

        console.log('Login successful for user:', username);
        const userWithoutPassword = {
          ...user,
          password: undefined
        };
        return done(null, userWithoutPassword);
      } catch (error) {
        console.error('Login error:', error);
        console.error('Error stack:', error.stack);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: any, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      console.log('Registering with password:', password);
      const user = await storage.createUser({
        username,
        password,
        email
      });

      // Remove password from response
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      };

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }

        // Remove password from response
        const userResponse = {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        };

        return res.status(200).json(userResponse);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Remove password from response
    const user = req.user as SelectUser;
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    };

    res.json(userResponse);
  });
}