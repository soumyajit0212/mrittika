import { db } from "~/server/db";
import { hashPassword } from "~/server/utils/auth";
import { minioClient } from "~/server/minio";

async function setup() {
  console.log("🚀 Starting database setup...");

  try {
    // Setup Minio buckets
    console.log("🪣 Setting up Minio buckets...");
    
    const bucketName = "expense-receipts";
    const bucketExists = await minioClient.bucketExists(bucketName);
    
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName);
      console.log(`✅ Created Minio bucket: ${bucketName}`);
    } else {
      console.log(`🪣 Minio bucket already exists: ${bucketName}`);
    }

    // Create admin user if it doesn't exist
    const existingAdmin = await db.user.findFirst({
      where: { role: "ADMIN" }
    });

    if (!existingAdmin) {
      console.log("👤 Creating admin user...");
      
      // Create admin member first
      const adminMember = await db.member.create({
        data: {
          memberName: "System Administrator",
          memberEmail: "admin@eventmanagement.com",
          memberPhone: "+1234567890"
        }
      });

      // Create admin user
      const hashedPassword = await hashPassword("admin123");
      await db.user.create({
        data: {
          email: "admin@eventmanagement.com",
          password: hashedPassword,
          role: "ADMIN",
          memberId: adminMember.id
        }
      });

      console.log("✅ Admin user created:");
      console.log("   Email: admin@eventmanagement.com");
      console.log("   Password: admin123");
    } else {
      console.log("👤 Admin user already exists");
    }

    // Create sample venues if none exist
    const venueCount = await db.venue.count();
    if (venueCount === 0) {
      console.log("🏢 Creating sample venues...");
      
      await db.venue.createMany({
        data: [
          {
            venueAddress: "123 Main Street, Downtown, City 12345",
            venueCapacity: 500,
            venueDetails: "Large banquet hall with modern amenities, parking available"
          },
          {
            venueAddress: "456 Oak Avenue, Suburb, City 67890",
            venueCapacity: 200,
            venueDetails: "Intimate venue perfect for smaller gatherings"
          },
          {
            venueAddress: "789 Pine Road, Uptown, City 11111",
            venueCapacity: 1000,
            venueDetails: "Grand ballroom with stage, full catering kitchen"
          }
        ]
      });
      
      console.log("✅ Sample venues created");
    } else {
      console.log("🏢 Venues already exist");
    }

    // Create sample products if none exist
    const productCount = await db.product.count();
    if (productCount === 0) {
      console.log("📦 Creating sample products...");
      
      // Entry products
      const entryProduct = await db.product.create({
        data: {
          productCode: "ENTRY-001",
          productName: "Event Entry",
          productDesc: "General admission to the event",
          productType: "Entry",
          productTypes: {
            create: [
              {
                productSize: "Adult",
                productChoice: "NONE",
                productPref: "NONE",
                productPrice: 50.00,
                productSubtype: "NONE"
              },
              {
                productSize: "Children",
                productChoice: "NONE",
                productPref: "NONE",
                productPrice: 25.00,
                productSubtype: "NONE"
              },
              {
                productSize: "Elder",
                productChoice: "NONE",
                productPref: "NONE",
                productPrice: 40.00,
                productSubtype: "NONE"
              }
            ]
          }
        }
      });

      // Food products
      const foodProduct = await db.product.create({
        data: {
          productCode: "FOOD-001",
          productName: "Event Meal",
          productDesc: "Delicious meal options for the event",
          productType: "Food",
          productTypes: {
            create: [
              {
                productSize: "Adult",
                productChoice: "VEG",
                productPref: "NONE",
                productPrice: 30.00,
                productSubtype: "DINE-IN"
              },
              {
                productSize: "Adult",
                productChoice: "NON-VEG",
                productPref: "CHICKEN",
                productPrice: 35.00,
                productSubtype: "DINE-IN"
              },
              {
                productSize: "Adult",
                productChoice: "NON-VEG",
                productPref: "MUTTON",
                productPrice: 40.00,
                productSubtype: "DINE-IN"
              },
              {
                productSize: "Adult",
                productChoice: "NON-VEG",
                productPref: "FISH",
                productPrice: 38.00,
                productSubtype: "DINE-IN"
              },
              {
                productSize: "Children",
                productChoice: "VEG",
                productPref: "NONE",
                productPrice: 20.00,
                productSubtype: "DINE-IN"
              },
              {
                productSize: "Children",
                productChoice: "NON-VEG",
                productPref: "CHICKEN",
                productPrice: 25.00,
                productSubtype: "DINE-IN"
              },
              {
                productSize: "Children",
                productChoice: "NON-VEG",
                productPref: "FISH",
                productPrice: 28.00,
                productSubtype: "DINE-IN"
              },
              {
                productSize: "Elder",
                productChoice: "VEG",
                productPref: "NONE",
                productPrice: 25.00,
                productSubtype: "DINE-IN"
              },
              {
                productSize: "Elder",
                productChoice: "NON-VEG",
                productPref: "CHICKEN",
                productPrice: 30.00,
                productSubtype: "DINE-IN"
              },
              {
                productSize: "Elder",
                productChoice: "NON-VEG",
                productPref: "FISH",
                productPrice: 33.00,
                productSubtype: "DINE-IN"
              }
            ]
          }
        }
      });

      console.log("✅ Sample products created");
    } else {
      console.log("📦 Products already exist");
    }

    // Create sample events if none exist
    const eventCount = await db.event.count();
    if (eventCount === 0) {
      console.log("🎉 Creating sample events...");
      
      // Get a venue to use for events
      const venue = await db.venue.findFirst();
      if (!venue) {
        throw new Error("No venues found. Cannot create events.");
      }

      const sampleEvent = await db.event.create({
        data: {
          eventName: "Annual Community Gathering 2024",
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
          eventDetails: "Join us for our annual community gathering with food, entertainment, and networking opportunities.",
          venueId: venue.id,
          sessions: {
            create: [
              {
                sessionName: "Welcome Breakfast",
                sessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                startTime: "08:00",
                endTime: "10:00",
                sessionDetails: "Start your day with a delicious breakfast and meet fellow community members.",
                sessionBalanceCapacity: 100
              },
              {
                sessionName: "Lunch & Networking",
                sessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                startTime: "12:00",
                endTime: "14:00",
                sessionDetails: "Enjoy a hearty lunch while networking with other attendees.",
                sessionBalanceCapacity: 150
              },
              {
                sessionName: "Evening Dinner Gala",
                sessionDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
                startTime: "18:00",
                endTime: "22:00",
                sessionDetails: "Join us for an elegant dinner gala with entertainment and awards ceremony.",
                sessionBalanceCapacity: 200
              }
            ]
          }
        },
        include: {
          sessions: true
        }
      });

      console.log("✅ Sample event and sessions created");

      // Create product-session mappings
      console.log("🔗 Creating product-session mappings...");
      
      const products = await db.product.findMany();
      const entryProduct = products.find(p => p.productType === "Entry");
      const foodProduct = products.find(p => p.productType === "Food");

      if (entryProduct && foodProduct) {
        // Map entry product to all sessions
        for (const session of sampleEvent.sessions) {
          await db.productSessionMap.create({
            data: {
              productId: entryProduct.id,
              sessionId: session.id
            }
          });
        }

        // Map food product to all sessions
        for (const session of sampleEvent.sessions) {
          await db.productSessionMap.create({
            data: {
              productId: foodProduct.id,
              sessionId: session.id
            }
          });
        }

        console.log("✅ Product-session mappings created");
      } else {
        console.log("⚠️ Could not find products to map to sessions");
      }
    } else {
      console.log("🎉 Events already exist");
    }

    // Create sample members if none exist (besides admin)
    const memberCount = await db.member.count();
    if (memberCount <= 1) {
      console.log("👥 Creating sample members...");
      
      const sampleMembers = await db.member.createMany({
        data: [
          {
            memberName: "John Smith",
            memberEmail: "john.smith@email.com",
            memberPhone: "+1234567891"
          },
          {
            memberName: "Jane Doe",
            memberEmail: "jane.doe@email.com",
            memberPhone: "+1234567892"
          },
          {
            memberName: "Mike Johnson",
            memberEmail: "mike.johnson@email.com",
            memberPhone: "+1234567893"
          }
        ]
      });

      // Create user accounts for some members
      const members = await db.member.findMany({
        where: {
          memberEmail: {
            in: ["john.smith@email.com", "jane.doe@email.com"]
          }
        }
      });

      for (const member of members) {
        const hashedPassword = await hashPassword("member123");
        await db.user.create({
          data: {
            email: member.memberEmail,
            password: hashedPassword,
            role: "MEMBER",
            memberId: member.id
          }
        });
      }

      console.log("✅ Sample members created");
      console.log("   Member logins:");
      console.log("   john.smith@email.com / member123");
      console.log("   jane.doe@email.com / member123");
    } else {
      console.log("👥 Members already exist");
    }

    console.log("🎉 Database setup completed successfully!");
    console.log("");
    console.log("🔑 Login credentials:");
    console.log("   Admin: admin@eventmanagement.com / admin123");
    console.log("   Member: john.smith@email.com / member123");
    console.log("   Member: jane.doe@email.com / member123");
    console.log("");

  } catch (error) {
    console.error("❌ Error during setup:", error);
    throw error;
  }
}

setup()
  .then(() => {
    console.log("setup.ts complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
