import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const standardRoom = await prisma.roomType.upsert({
    where: {
      name: "Standard Room",
    },
    update: {},
    create: {
      name: "Standard Room",
      description: "A comfortable room suitable for short stays.",
      capacity: 2,
      pricePerNight: 1800,
    },
  });

  const deluxeRoom = await prisma.roomType.upsert({
    where: {
      name: "Deluxe Room",
    },
    update: {},
    create: {
      name: "Deluxe Room",
      description: "A spacious room with additional comfort and amenities.",
      capacity: 3,
      pricePerNight: 2800,
    },
  });

  const familyRoom = await prisma.roomType.upsert({
    where: {
      name: "Family Room",
    },
    update: {},
    create: {
      name: "Family Room",
      description: "A larger room designed for families and groups.",
      capacity: 5,
      pricePerNight: 4000,
    },
  });

  console.log({
    standardRoom,
    deluxeRoom,
    familyRoom,
  });

  await prisma.room.createMany({
    data: [
      {
        roomNumber: "101",
        roomTypeId: standardRoom.id,
      },
      {
        roomNumber: "102",
        roomTypeId: standardRoom.id,
      },
      {
        roomNumber: "201",
        roomTypeId: deluxeRoom.id,
      },
      {
        roomNumber: "202",
        roomTypeId: deluxeRoom.id,
      },
      {
        roomNumber: "301",
        roomTypeId: familyRoom.id,
      },
    ],
    skipDuplicates: true,
  });

  const hashedPassword = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@stayinn.com",
    },
    update: {},
    create: {
      firstName: "StayInn",
      lastName: "Admin",
      email: "admin@stayinn.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  const guest = await prisma.user.upsert({
    where: {
      email: "guest@stayinn.com",
    },
    update: {},
    create: {
      firstName: "John",
      lastName: "Doe",
      email: "guest@stayinn.com",
      password: hashedPassword,
      role: "GUEST",
    },
  });

  console.log({ admin, guest });

  const room = await prisma.room.findUnique({
    where: {
      roomNumber: "101",
    },
  });

  if (!room) {
    throw new Error("Room not found");
  }

  await prisma.reservation.deleteMany({
    where: {
      userId: guest.id,
      roomId: room.id,
      checkIn: new Date("2026-10-01"),
      checkOut: new Date("2026-10-04"),
    },
  });

  const reservation = await prisma.reservation.create({
    data: {
      checkIn: new Date("2026-10-01"),
      checkOut: new Date("2026-10-04"),
      guests: 2,
      totalAmount: 5400,
      status: "CONFIRMED",
      userId: guest.id,
      roomId: room.id,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
