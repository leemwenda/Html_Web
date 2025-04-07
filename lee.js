// This file provides a comprehensive view of the complete backend codebase
// organized by directories and file types

const BACKEND_STRUCTURE = {
    "app": {
      "api": {
        "auth": {
          "login/route.ts": `
  import { cookies } from "next/headers"
  import { NextResponse } from "next/server"
  import { db } from "@/lib/db"
  import { comparePasswords, generateToken } from "@/lib/auth-utils"
  
  export async function POST(request: Request) {
    try {
      const { email, password } = await request.json()
  
      if (!email || !password) {
        return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
      }
  
      // Find user by email
      const user = await db.user.findUnique({
        where: { email },
      })
  
      if (!user) {
        return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
      }
  
      // Verify password
      const passwordMatch = await comparePasswords(password, user.password)
      if (!passwordMatch) {
        return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
      }
  
      // Generate JWT token
      const token = generateToken(user.id)
  
      // Set cookie
      cookies().set({
        name: "auth_token",
        value: token,
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      })
  
      // Return user data (excluding password)
      const { password: _, ...userData } = user
      return NextResponse.json(userData)
    } catch (error) {
      console.error("Login error:", error)
      return NextResponse.json({ message: "An error occurred during login" }, { status: 500 })
    }
  }`,
  
          "logout/route.ts": `
  import { cookies } from "next/headers"
  import { NextResponse } from "next/server"
  
  export async function POST() {
    try {
      // Clear auth cookie
      cookies().delete("auth_token")
  
      return NextResponse.json({ message: "Logged out successfully" })
    } catch (error) {
      console.error("Logout error:", error)
      return NextResponse.json({ message: "An error occurred during logout" }, { status: 500 })
    }
  }`,
  
          "me/route.ts": `
  import { cookies } from "next/headers"
  import { NextResponse } from "next/server"
  import { db } from "@/lib/db"
  import { verifyToken } from "@/lib/auth-utils"
  
  export async function GET() {
    try {
      // Get token from cookies
      const token = cookies().get("auth_token")?.value
  
      if (!token) {
        return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
      }
  
      // Verify token
      const payload = verifyToken(token)
      if (!payload) {
        cookies().delete("auth_token")
        return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 })
      }
  
      // Get user from database
      const user = await db.user.findUnique({
        where: { id: payload.userId },
      })
  
      if (!user) {
        cookies().delete("auth_token")
        return NextResponse.json({ message: "User not found" }, { status: 404 })
      }
  
      // Return user data (excluding password)
      const { password, ...userData } = user
      return NextResponse.json(userData)
    } catch (error) {
      console.error("Auth check error:", error)
      return NextResponse.json({ message: "An error occurred during authentication check" }, { status: 500 })
    }
  }`,
  
          "signup/route.ts": `
  import { cookies } from "next/headers"
  import { NextResponse } from "next/server"
  import { db } from "@/lib/db"
  import { hashPassword, generateToken } from "@/lib/auth-utils"
  
  export async function POST(request: Request) {
    try {
      const { name, email, password } = await request.json()
  
      if (!name || !email || !password) {
        return NextResponse.json({ message: "Name, email, and password are required" }, { status: 400 })
      }
  
      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email },
      })
  
      if (existingUser) {
        return NextResponse.json({ message: "User with this email already exists" }, { status: 409 })
      }
  
      // Hash password
      const hashedPassword = await hashPassword(password)
  
      // Create new user
      const newUser = await db.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      })
  
      // Generate JWT token
      const token = generateToken(newUser.id)
  
      // Set cookie
      cookies().set({
        name: "auth_token",
        value: token,
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      })
  
      // Return user data (excluding password)
      const { password: _, ...userData } = newUser
      return NextResponse.json(userData)
    } catch (error) {
      console.error("Signup error:", error)
      return NextResponse.json({ message: "An error occurred during signup" }, { status: 500 })
    }
  }`
        },
        "bookings/route.ts": `
  import { NextResponse } from "next/server"
  import { db } from "@/lib/db"
  import { verifyToken } from "@/lib/auth-utils"
  import { cookies } from "next/headers"
  
  export async function POST(request: Request) {
    try {
      const { name, email, phone, destination, departureDate, travelers, comments } = await request.json()
  
      // Validate required fields
      if (!name || !email || !phone || !destination || !departureDate || !travelers) {
        return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
      }
  
      // Check if user is authenticated
      let userId = null
      const token = cookies().get("auth_token")?.value
  
      if (token) {
        const payload = verifyToken(token)
        if (payload) {
          userId = payload.userId
        }
      }
  
      // Create booking
      const booking = await db.booking.create({
        data: {
          name,
          email,
          phone,
          destinationId: destination,
          departureDate: new Date(departureDate),
          travelers: Number.parseInt(travelers),
          comments,
          userId,
        },
      })
  
      // Send confirmation email (implementation would go here)
      // await sendBookingConfirmationEmail(email, booking)
  
      return NextResponse.json({
        message: "Booking created successfully",
        booking,
      })
    } catch (error) {
      console.error("Error creating booking:", error)
      return NextResponse.json({ message: "Failed to create booking" }, { status: 500 })
    }
  }
  
  export async function GET() {
    try {
      // Check if user is authenticated
      const token = cookies().get("auth_token")?.value
  
      if (!token) {
        return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
      }
  
      const payload = verifyToken(token)
      if (!payload) {
        return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 })
      }
  
      // Get bookings for the authenticated user
      const bookings = await db.booking.findMany({
        where: {
          userId: payload.userId,
        },
        include: {
          destination: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
  
      return NextResponse.json(bookings)
    } catch (error) {
      console.error("Error fetching bookings:", error)
      return NextResponse.json({ message: "Failed to fetch bookings" }, { status: 500 })
    }
  }`,
        "contact/route.ts": `
  import { NextResponse } from "next/server"
  import { db } from "@/lib/db"
  
  export async function POST(request: Request) {
    try {
      const { name, email, subject, message } = await request.json()
  
      // Validate required fields
      if (!name || !email || !subject || !message) {
        return NextResponse.json({ message: "All fields are required" }, { status: 400 })
      }
  
      // Create contact message
      const contactMessage = await db.contactMessage.create({
        data: {
          name,
          email,
          subject,
          message,
        },
      })
  
      // Send notification email to admin (implementation would go here)
      // await sendContactNotificationEmail(contactMessage)
  
      return NextResponse.json({
        message: "Message sent successfully",
        contactId: contactMessage.id,
      })
    } catch (error) {
      console.error("Error sending contact message:", error)
      return NextResponse.json({ message: "Failed to send message" }, { status: 500 })
    }
  }`,
        "destinations/route.ts": `
  import { NextResponse } from "next/server"
  import { db } from "@/lib/db"
  
  export async function GET() {
    try {
      const destinations = await db.destination.findMany({
        orderBy: {
          name: "asc",
        },
      })
  
      return NextResponse.json(destinations)
    } catch (error) {
      console.error("Error fetching destinations:", error)
      return NextResponse.json({ message: "Failed to fetch destinations" }, { status: 500 })
    }
  }`,
        "destinations/[id]/route.ts": `
  import { NextResponse } from "next/server"
  import { db } from "@/lib/db"
  
  export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
      const destination = await db.destination.findUnique({
        where: {
          id: params.id,
        },
      })
  
      if (!destination) {
        return NextResponse.json({ message: "Destination not found" }, { status: 404 })
      }
  
      return NextResponse.json(destination)
    } catch (error) {
      console.error("Error fetching destination:", error)
      return NextResponse.json({ message: "Failed to fetch destination" }, { status: 500 })
    }
  }`,
        "seed/route.ts": `
  import { NextResponse } from "next/server"
  import { db } from "@/lib/db"
  import { hashPassword } from "@/lib/auth-utils"
  
  export async function POST() {
    try {
      // Check if we already have destinations
      const existingDestinations = await db.destination.count()
  
      if (existingDestinations === 0) {
        // Seed destinations
        await db.destination.createMany({
          data: [
            {
              name: "Maasai Mara National Reserve",
              image: "https://tse3.mm.bing.net/th?id=OIP.w0lfNX9l9OFgCJ469cnuggHaEK&pid=Api",
              description:
                "Famous for the annual wildebeest migration, the Maasai Mara offers incredible wildlife viewing opportunities with lions, elephants, giraffes, and more in their natural habitat.",
              reason:
                "Visit for the spectacular Great Migration (July-October), where millions of wildebeest cross the Mara River, and for the chance to see the Big Five in one location.",
              price: "$56/Ksh 6,000",
            },
            {
              name: "Diani Beach",
              image: "https://tse4.mm.bing.net/th?id=OIP.YI78AOWG9COMx67oiSAp4AHaE8&pid=Api",
              description:
                "A stunning white sand beach along Kenya's coast with crystal clear turquoise waters, perfect for swimming, snorkeling, and water sports.",
              reason:
                "Visit for the pristine beaches, vibrant coral reefs for snorkeling and diving, and the relaxed coastal atmosphere with excellent seafood restaurants.",
              price: "$70/Ksh 7,500",
            },
            // Additional destinations omitted for brevity
          ],
        })
      }
  
      // Check if we already have a demo user
      const existingUser = await db.user.findUnique({
        where: { email: "demo@panamatravelers.com" },
      })
  
      if (!existingUser) {
        // Create a demo user
        const hashedPassword = await hashPassword("password123")
        await db.user.create({
          data: {
            name: "Demo User",
            email: "demo@panamatravelers.com",
            password: hashedPassword,
          },
        })
      }
  
      return NextResponse.json({
        message: "Database seeded successfully",
      })
    } catch (error) {
      console.error("Seeding error:", error)
      return NextResponse.json({ message: "Failed to seed database" }, { status: 500 })
    }
  }`
      },
      "layout.tsx": `
  import type React from "react"
  import { Inter } from 'next/font/google'
  import { ThemeProvider } from "@/components/theme-provider"
  import { Toaster } from "@/components/ui/toaster"
  import { Providers } from "./providers"
  import "./globals.css"
  
  const inter = Inter({ subsets: ["latin"] })
  
  export const metadata = {
    title: "Panama Travelers Agency - Discover Kenya",
    description: "Your journey to unforgettable destinations begins here",
  }
  
  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode
  }>) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <Providers>
              {children}
              <Toaster />
            </Providers>
          </ThemeProvider>
        </body>
      </html>
    )
  }`,
      "page.tsx": `
  import { Navbar } from "@/components/navbar"
  import { Footer } from "@/components/footer"
  import { HomePage } from "@/components/home-page"
  import { ServicesPage } from "@/components/services-page"
  import { AboutPage } from "@/components/about-page"
  import { ContactPage } from "@/components/contact-page"
  import { LoginPage } from "@/components/login-page"
  
  export default function Home() {
    return (
      <main className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <HomePage />
          <ServicesPage />
          <AboutPage />
          <ContactPage />
          <LoginPage />
        </div>
        <Footer />
      </main>
    )
  }`,
      "providers.tsx": `
  "use client"
  
  import type { ReactNode } from "react"
  import { AuthProvider } from "@/lib/auth-context"
  
  export function Providers({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>
  }`
    },
    "lib": {
      "auth-context.tsx": `
  "use client"
  
  import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
  import { useToast } from "@/components/ui/use-toast"
  
  type User = {
    id: string
    name: string
    email: string
  } | null
  
  type AuthContextType = {
    user: User
    login: (email: string, password: string) => Promise<boolean>
    signup: (name: string, email: string, password: string) => Promise<boolean>
    logout: () => void
    loading: boolean
  }
  
  const AuthContext = createContext<AuthContextType | undefined>(undefined)
  
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User>(null)
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()
  
    useEffect(() => {
      // Check if user is logged in on mount
      const checkAuth = async () => {
        try {
          const response = await fetch("/api/auth/me")
          if (response.ok) {
            const userData = await response.json()
            setUser(userData)
          }
        } catch (error) {
          console.error("Auth check failed:", error)
        } finally {
          setLoading(false)
        }
      }
  
      checkAuth()
    }, [])
  
    const login = async (email: string, password: string) => {
      try {
        setLoading(true)
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        })
  
        if (!response.ok) {
          const error = await response.json()
          toast({
            title: "Login failed",
            description: error.message || "Invalid credentials",
            variant: "destructive",
          })
          return false
        }
  
        const userData = await response.json()
        setUser(userData)
        toast({
          title: "Login successful",
          description: \`Welcome back, \${userData.name}!\`,
        })
        return true
      } catch (error) {
        console.error("Login error:", error)
        toast({
          title: "Login failed",
          description: "An unexpected error occurred",
          variant: "destructive",
        })
        return false
      } finally {
        setLoading(false)
      }
    }
  
    const signup = async (name: string, email: string, password: string) => {
      try {
        setLoading(true)
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password }),
        })
  
        if (!response.ok) {
          const error = await response.json()
          toast({
            title: "Signup failed",
            description: error.message || "Could not create account",
            variant: "destructive",
          })
          return false
        }
  
        const userData = await response.json()
        setUser(userData)
        toast({
          title: "Account created",
          description: "Your account has been created successfully!",
        })
        return true
      } catch (error) {
        console.error("Signup error:", error)
        toast({
          title: "Signup failed",
          description: "An unexpected error occurred",
          variant: "destructive",
        })
        return false
      } finally {
        setLoading(false)
      }
    }
  
    const logout = async () => {
      try {
        setLoading(true)
        await fetch("/api/auth/logout", {
          method: "POST",
        })
        setUser(null)
        toast({
          title: "Logged out",
          description: "You have been logged out successfully",
        })
      } catch (error) {
        console.error("Logout error:", error)
      } finally {
        setLoading(false)
      }
    }
  
    return <AuthContext.Provider value={{ user, login, signup, logout, loading }}>{children}</AuthContext.Provider>
  }
  
  export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
      throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
  }`,
      "auth-utils.ts": `
  import { SignJWT, jwtVerify } from "jose"
  import { compare, hash } from "bcrypt"
  
  // Secret key for JWT
  const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-at-least-32-chars-long")
  
  // Hash password
  export async function hashPassword(password: string): Promise<string> {
    return hash(password, 10)
  }
  
  // Compare password with hash
  export async function comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return compare(password, hashedPassword)
  }
  
  // Generate JWT token
  export function generateToken(userId: string): string {
    const token = new SignJWT({ userId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // 1 week
      .sign(JWT_SECRET)
  
    return token
  }
  
  // Verify JWT token
  export async function verifyToken(token: string) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      return payload
    } catch (error) {
      console.error("Token verification failed:", error)
      return null
    }
  }`,
      "db.ts": `
  import { PrismaClient } from "@prisma/client"
  
  // PrismaClient is attached to the \`global\` object in development to prevent
  // exhausting your database connection limit.
  const globalForPrisma = global as unknown as { prisma: PrismaClient }
  
  export const db = globalForPrisma.prisma || new PrismaClient()
  
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db`
    },
    "prisma": {
      "schema.prisma": `
  // This is your Prisma schema file,
  // learn more about it in the docs: https://pris.ly/d/prisma-schema
  
  generator client {
    provider = "prisma-client-js"
  }
  
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  
  model User {
    id        String    @id @default(cuid())
    name      String
    email     String    @unique
    password  String
    createdAt DateTime  @default(now())
    updatedAt DateTime  @updatedAt
    bookings  Booking[]
  }
  
  model Destination {
    id          String    @id @default(cuid())
    name        String
    image       String
    description String
    reason      String
    price       String
    createdAt   DateTime  @default(now())
    updatedAt   DateTime  @updatedAt
    bookings    Booking[]
  }
  
  model Booking {
    id            String      @id @default(cuid())
    userId        String?
    user          User?       @relation(fields: [userId], references: [id])
    destinationId String?
    destination   Destination? @relation(fields: [destinationId], references: [id])
    name          String
    email         String
    phone         String
    departureDate DateTime
    travelers     Int
    comments      String?
    status        BookingStatus @default(PENDING)
    createdAt     DateTime    @default(now())
    updatedAt     DateTime    @updatedAt
  }
  
  model ContactMessage {
    id        String   @id @default(cuid())
    name      String
    email     String
    subject   String
    message   String
    isRead    Boolean  @default(false)
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }
  
  enum BookingStatus {
    PENDING
    CONFIRMED
    CANCELLED
  }`
    }
  };
  
  // Display code overview by directories
  console.log("🌟 PANAMA TRAVELERS AGENCY - BACKEND CODE 🌟");
  console.log("===========================================");
  console.log("\nDirectory Structure:");
  
  Object.keys(BACKEND_STRUCTURE).forEach(dir => {
    console.log(`\n📁 ${dir}/`);
    
    if (typeof BACKEND_STRUCTURE[dir] === 'object') {
      Object.keys(BACKEND_STRUCTURE[dir]).forEach(subDir => {
        if (typeof BACKEND_STRUCTURE[dir][subDir] === 'object') {
          console.log(`  📁 ${subDir}/`);
          Object.keys(BACKEND_STRUCTURE[dir][subDir]).forEach(file => {
            if (typeof BACKEND_STRUCTURE[dir][subDir][file] === 'object') {
              console.log(`    📁 ${file}/`);
              Object.keys(BACKEND_STRUCTURE[dir][subDir][file]).forEach(subFile => {
                console.log(`      📄 ${subFile}`);
              });
            } else {
              console.log(`    📄 ${file}`);
            }
          });
        } else {
          console.log(`  📄 ${subDir}`);
        }
      });
    } else {
      console.log(`  📄 ${dir}`);
    }
  });
  
  console.log("\n\n✅ SETUP INSTRUCTIONS ✅");
  console.log("========================");
  console.log("\n1. DATABASE SETUP:");
  console.log("   - Create a PostgreSQL database");
  console.log("   - Set DATABASE_URL in your .env file");
  console.log("   - Run 'npx prisma migrate dev' to create tables");
  console.log("   - Run 'npx prisma generate' to generate Prisma client");
  
  console.log("\n2. ENVIRONMENT VARIABLES:");
  console.log("   - Create a .env file with the following:");
  console.log("     DATABASE_URL=\"postgresql://username:password@localhost:5432/yourdatabase\"");
  console.log("     JWT_SECRET=\"your-secret-key-at-least-32-chars-long\"");
  
  console.log("\n3. SEED DATABASE:");
  console.log("   - POST request to /api/seed to populate initial data");
  console.log("   - Demo account: demo@panamatravelers.com / password123");
  
  console.log("\n4. DEPENDENCIES:");
  console.log("   - Main packages: next.js, prisma, bcrypt, jose");
  console.log("   - Install with: npm install @prisma/client bcrypt jose");
  console.log("   - Dev dependencies: npm install -D prisma @types/bcrypt");
  
  console.log("\n5. API ENDPOINTS:");
  console.log("   - Auth: /api/auth/signup, /api/auth/login, /api/auth/logout, /api/auth/me");
  console.log("   - Bookings: /api/bookings (GET, POST)");
  console.log("   - Contact: /api/contact (POST)");
  console.log("   - Destinations: /api/destinations, /api/destinations/[id]");
  console.log("   - Seed: /api/seed (POST)");