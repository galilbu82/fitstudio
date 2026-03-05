import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Admin
  const adminPassword = await bcrypt.hash("admin123", 12)
  await prisma.user.upsert({
    where: { email: "admin@fitstudio.com" },
    update: {},
    create: {
      email: "admin@fitstudio.com",
      password: adminPassword,
      role: "ADMIN",
      profile: { create: { firstName: "Admin", lastName: "User" } },
    },
  })

  // Coach
  const coachPassword = await bcrypt.hash("coach123", 12)
  await prisma.user.upsert({
    where: { email: "coach@fitstudio.com" },
    update: {},
    create: {
      email: "coach@fitstudio.com",
      password: coachPassword,
      role: "COACH",
      profile: {
        create: {
          firstName: "John",
          lastName: "Trainer",
          bio: "Certified personal trainer with 10 years experience",
        },
      },
    },
  })

  // Trainee
  const traineePassword = await bcrypt.hash("trainee123", 12)
  await prisma.user.upsert({
    where: { email: "trainee@fitstudio.com" },
    update: {},
    create: {
      email: "trainee@fitstudio.com",
      password: traineePassword,
      role: "TRAINEE",
      profile: { create: { firstName: "Jane", lastName: "Doe" } },
    },
  })

  // Exercises
  const exercises = [
    { name: "Barbell Bench Press", muscleGroup: "Chest", equipment: "Barbell" },
    { name: "Incline Dumbbell Press", muscleGroup: "Chest", equipment: "Dumbbells" },
    { name: "Cable Flyes", muscleGroup: "Chest", equipment: "Cable Machine" },
    { name: "Barbell Squat", muscleGroup: "Legs", equipment: "Barbell" },
    { name: "Leg Press", muscleGroup: "Legs", equipment: "Machine" },
    { name: "Romanian Deadlift", muscleGroup: "Legs", equipment: "Barbell" },
    { name: "Leg Curl", muscleGroup: "Legs", equipment: "Machine" },
    { name: "Calf Raises", muscleGroup: "Legs", equipment: "Machine" },
    { name: "Lat Pulldown", muscleGroup: "Back", equipment: "Cable Machine" },
    { name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell" },
    { name: "Pull-ups", muscleGroup: "Back", equipment: "Bodyweight" },
    { name: "Deadlift", muscleGroup: "Back", equipment: "Barbell" },
    { name: "Seated Cable Row", muscleGroup: "Back", equipment: "Cable Machine" },
    { name: "Overhead Press", muscleGroup: "Shoulders", equipment: "Barbell" },
    { name: "Lateral Raises", muscleGroup: "Shoulders", equipment: "Dumbbells" },
    { name: "Front Raises", muscleGroup: "Shoulders", equipment: "Dumbbells" },
    { name: "Barbell Curl", muscleGroup: "Arms", equipment: "Barbell" },
    { name: "Hammer Curl", muscleGroup: "Arms", equipment: "Dumbbells" },
    { name: "Tricep Pushdown", muscleGroup: "Arms", equipment: "Cable Machine" },
    { name: "Skull Crushers", muscleGroup: "Arms", equipment: "Barbell" },
    { name: "Plank", muscleGroup: "Core", equipment: "Bodyweight" },
    { name: "Crunches", muscleGroup: "Core", equipment: "Bodyweight" },
    { name: "Russian Twists", muscleGroup: "Core", equipment: "Bodyweight" },
    { name: "Push-ups", muscleGroup: "Chest", equipment: "Bodyweight" },
    { name: "Dips", muscleGroup: "Arms", equipment: "Bodyweight" },
  ]

  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: {},
      create: exercise,
    })
  }

  // Achievements
  const achievements = [
    { name: "First Steps", description: "Complete your first workout", category: "workout", threshold: 1 },
    { name: "Getting Started", description: "Complete 10 workouts", category: "workout", threshold: 10 },
    { name: "Consistent", description: "Complete 50 workouts", category: "workout", threshold: 50 },
    { name: "Week Warrior", description: "7-day workout streak", category: "streak", threshold: 7 },
    { name: "Iron Starter", description: "Lift 10,000 kg total volume", category: "volume", threshold: 10000 },
    { name: "Iron Veteran", description: "Lift 100,000 kg total volume", category: "volume", threshold: 100000 },
    { name: "Class Act", description: "Attend 10 classes", category: "attendance", threshold: 10 },
  ]

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: {},
      create: achievement,
    })
  }

  console.log("Seed completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
