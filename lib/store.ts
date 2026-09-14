import { randomUUID } from 'crypto';
import { Member, Membership, Trainer, GymClass, Payment, EmailNotification, Exercise, WorkoutPlan, Workout, WorkoutExercise, WorkoutProgress, WorkoutTemplate, Recipe, NutritionPlan, DailyMealPlan, MacroTargets, ShoppingList, Meal, Habit, HabitEntry, WhoopConnection, WhoopData } from '@/types';
import { calculateTargets, splitIntoMeals, type Sex, type ActivityLevel, type Goal } from './nutrition';
import { exercisesDatabase } from './exercises';
import { recipesData } from './recipes';

// Simple password hashing (in production, use bcrypt)
// This function must work in both build-time and runtime environments
function hashPassword(password: string): string {
  // Simple hash for demo - in production use bcrypt
  // Using a simple encoding that works everywhere (no Buffer dependency)
  // This is just for demo purposes - use proper bcrypt in production
  let hash = '';
  for (let i = 0; i < password.length; i++) {
    const charCode = password.charCodeAt(i);
    hash += String.fromCharCode(charCode + (i % 10) + 1);
  }
  return hash.split('').reverse().join('') + password.length.toString();
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// In-memory data store (can be replaced with a real database later)
class DataStore {
  private members: Member[] = [];
  private memberships: Membership[] = [];
  private trainers: Trainer[] = [];
  private classes: GymClass[] = [];
  private payments: Payment[] = [];
  private notifications: EmailNotification[] = [];
  
  // Phase 2: Workout Engine
  private exercises: Exercise[] = [];
  private workoutPlans: WorkoutPlan[] = [];
  private workouts: Workout[] = [];
  private workoutProgress: WorkoutProgress[] = [];
  private workoutTemplates: WorkoutTemplate[] = [];

  // Phase 3: Nutrition Planner
  private recipes: Recipe[] = [];
  private nutritionPlans: NutritionPlan[] = [];
  private dailyMealPlans: DailyMealPlan[] = [];
  private shoppingLists: ShoppingList[] = [];

  // Phase 4: Habit Tracking & Whoop Integration
  private habits: Habit[] = [];
  private habitEntries: HabitEntry[] = [];
  private whoopConnections: WhoopConnection[] = [];
  private whoopData: WhoopData[] = [];

  // Initialize with sample data
  constructor() {
    // Lazy initialization to avoid build-time issues
    if (typeof window === 'undefined') {
      // Server-side: initialize immediately
      this.initializeSampleData();
    } else {
      // Client-side: should not happen, but safe guard
    this.initializeSampleData();
    }
  }

  private initializeSampleData() {
    // Sample memberships
    this.memberships = [
      {
        id: '1',
        name: 'Basic Plan',
        description: 'Access to gym facilities',
        price: 49.99,
        duration: 30,
        features: ['Gym Access', 'Locker Room'],
        status: 'active',
      },
      {
        id: '2',
        name: 'Premium Plan',
        description: 'Full access + classes',
        price: 79.99,
        duration: 30,
        features: ['Gym Access', 'All Classes', 'Personal Training Session', 'Locker Room'],
        status: 'active',
      },
      {
        id: '3',
        name: 'Elite Plan',
        description: 'Premium + extras',
        price: 129.99,
        duration: 30,
        features: ['Gym Access', 'All Classes', 'Unlimited Personal Training', 'Nutrition Planning', 'VIP Locker'],
        status: 'active',
      },
    ];

    // Sample trainers
    this.trainers = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@gym.com',
        phone: '555-0101',
        specialization: 'Strength Training',
        hireDate: '2023-01-15',
        status: 'active',
      },
      {
        id: '2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@gym.com',
        phone: '555-0102',
        specialization: 'Yoga & Pilates',
        hireDate: '2023-02-20',
        status: 'active',
      },
      {
        id: '3',
        firstName: 'Mike',
        lastName: 'Davis',
        email: 'mike.davis@gym.com',
        phone: '555-0103',
        specialization: 'Cardio & HIIT',
        hireDate: '2023-03-10',
        status: 'active',
      },
    ];

    // Sample members (default password: "password123")
    this.members = [
      {
        id: '1',
        firstName: 'Alice',
        lastName: 'Williams',
        email: 'alice.williams@email.com',
        phone: '555-1001',
        password: hashPassword('password123'),
        dateOfBirth: '1990-05-15',
        joinDate: '2024-01-10',
        membershipId: '2',
        status: 'active',
        notes: 'Prefers morning workouts',
        completedSessions: 12,
      },
      {
        id: '2',
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'bob.brown@email.com',
        phone: '555-1002',
        password: hashPassword('password123'),
        dateOfBirth: '1985-08-22',
        joinDate: '2024-01-15',
        membershipId: '1',
        status: 'active',
        completedSessions: 8,
      },
      {
        id: '3',
        firstName: 'Carol',
        lastName: 'Miller',
        email: 'carol.miller@email.com',
        phone: '555-1003',
        password: hashPassword('password123'),
        dateOfBirth: '1992-11-30',
        joinDate: '2023-12-05',
        membershipId: '3',
        status: 'active',
        notes: 'Personal training client',
        completedSessions: 25,
      },
    ];

    // Sample classes
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    this.classes = [
      {
        id: '1',
        name: 'Morning Yoga',
        description: 'Relaxing yoga session to start your day',
        trainerId: '2',
        date: tomorrow.toISOString().split('T')[0],
        startTime: '07:00',
        endTime: '08:00',
        capacity: 20,
        enrolledMembers: ['1', '3'],
        waitlist: [],
        checkedInMembers: [],
        status: 'scheduled',
      },
      {
        id: '2',
        name: 'HIIT Bootcamp',
        description: 'High-intensity interval training',
        trainerId: '3',
        date: tomorrow.toISOString().split('T')[0],
        startTime: '18:00',
        endTime: '19:00',
        capacity: 15,
        enrolledMembers: ['2'],
        waitlist: [],
        checkedInMembers: [],
        status: 'scheduled',
      },
    ];

    // Phase 2: Import comprehensive exercise database
    this.exercises = exercisesDatabase;

    // Phase 3: Import recipes from recipes database
    this.recipes = recipesData;
  }

  // Member methods
  getAllMembers(): Member[] {
    return this.members;
  }

  getMember(id: string): Member | undefined {
    return this.members.find(m => m.id === id);
  }

  getMemberByEmail(email: string): Member | undefined {
    return this.members.find(m => m.email === email);
  }

  addMember(member: Omit<Member, 'id'>): Member {
    const newMember: Member = {
      ...member,
      id: Date.now().toString(),
    };
    this.members.push(newMember);
    return newMember;
  }

  updateMember(id: string, updates: Partial<Member>): Member | null {
    const index = this.members.findIndex(m => m.id === id);
    if (index === -1) return null;
    this.members[index] = { ...this.members[index], ...updates };
    return this.members[index];
  }

  deleteMember(id: string): boolean {
    const index = this.members.findIndex(m => m.id === id);
    if (index === -1) return false;
    this.members.splice(index, 1);
    return true;
  }

  // Membership methods
  getAllMemberships(): Membership[] {
    return this.memberships;
  }

  getMembership(id: string): Membership | undefined {
    return this.memberships.find(m => m.id === id);
  }

  addMembership(membership: Omit<Membership, 'id'>): Membership {
    const newMembership: Membership = {
      ...membership,
      id: Date.now().toString(),
    };
    this.memberships.push(newMembership);
    return newMembership;
  }

  updateMembership(id: string, updates: Partial<Membership>): Membership | null {
    const index = this.memberships.findIndex(m => m.id === id);
    if (index === -1) return null;
    this.memberships[index] = { ...this.memberships[index], ...updates };
    return this.memberships[index];
  }

  deleteMembership(id: string): boolean {
    const index = this.memberships.findIndex(m => m.id === id);
    if (index === -1) return false;
    this.memberships.splice(index, 1);
    return true;
  }

  // Trainer methods
  getAllTrainers(): Trainer[] {
    return this.trainers;
  }

  getTrainer(id: string): Trainer | undefined {
    return this.trainers.find(t => t.id === id);
  }

  addTrainer(trainer: Omit<Trainer, 'id'>): Trainer {
    const newTrainer: Trainer = {
      ...trainer,
      id: Date.now().toString(),
    };
    this.trainers.push(newTrainer);
    return newTrainer;
  }

  updateTrainer(id: string, updates: Partial<Trainer>): Trainer | null {
    const index = this.trainers.findIndex(t => t.id === id);
    if (index === -1) return null;
    this.trainers[index] = { ...this.trainers[index], ...updates };
    return this.trainers[index];
  }

  deleteTrainer(id: string): boolean {
    const index = this.trainers.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.trainers.splice(index, 1);
    return true;
  }

  // Class methods
  getAllClasses(): GymClass[] {
    return this.classes;
  }

  getClass(id: string): GymClass | undefined {
    return this.classes.find(c => c.id === id);
  }

  addClass(gymClass: Omit<GymClass, 'id'>): GymClass {
    const newClass: GymClass = {
      ...gymClass,
      id: Date.now().toString(),
    };
    this.classes.push(newClass);
    return newClass;
  }

  updateClass(id: string, updates: Partial<GymClass>): GymClass | null {
    const index = this.classes.findIndex(c => c.id === id);
    if (index === -1) return null;
    this.classes[index] = { ...this.classes[index], ...updates };
    return this.classes[index];
  }

  deleteClass(id: string): boolean {
    const index = this.classes.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.classes.splice(index, 1);
    return true;
  }

  // Authentication methods
  authenticateMember(email: string, password: string): Member | null {
    const member = this.members.find(m => m.email.toLowerCase() === email.toLowerCase());
    if (!member || !member.password) return null;
    if (!verifyPassword(password, member.password)) return null;
    if (member.status !== 'active') return null;
    return member;
  }

  // Session tracking methods
  incrementMemberSessions(memberId: string): boolean {
    const member = this.getMember(memberId);
    if (!member) return false;
    member.completedSessions = (member.completedSessions || 0) + 1;
    return true;
  }

  getMemberSessions(memberId: string): number {
    const member = this.getMember(memberId);
    return member?.completedSessions || 0;
  }

  // Check-in methods
  checkInMember(classId: string, memberId: string): boolean {
    const gymClass = this.getClass(classId);
    if (!gymClass) return false;
    if (!gymClass.enrolledMembers.includes(memberId)) return false;
    if (gymClass.checkedInMembers.includes(memberId)) return false;
    
    gymClass.checkedInMembers.push(memberId);
    
    // Increment session count when checking in
    this.incrementMemberSessions(memberId);
    
    return true;
  }

  // Waitlist methods
  addToWaitlist(classId: string, memberId: string): boolean {
    const gymClass = this.getClass(classId);
    if (!gymClass) return false;
    if (gymClass.enrolledMembers.includes(memberId)) return false;
    if (gymClass.waitlist.includes(memberId)) return false;
    
    gymClass.waitlist.push(memberId);
    return true;
  }

  removeFromWaitlist(classId: string, memberId: string): boolean {
    const gymClass = this.getClass(classId);
    if (!gymClass) return false;
    const index = gymClass.waitlist.indexOf(memberId);
    if (index === -1) return false;
    gymClass.waitlist.splice(index, 1);
    return true;
  }

  // When a spot opens, move first waitlist member to enrolled
  processWaitlist(classId: string): boolean {
    const gymClass = this.getClass(classId);
    if (!gymClass) return false;
    if (gymClass.enrolledMembers.length >= gymClass.capacity) return false;
    if (gymClass.waitlist.length === 0) return false;
    
    const memberId = gymClass.waitlist.shift();
    if (memberId) {
      gymClass.enrolledMembers.push(memberId);
      // Send notification (in production)
      this.createNotification(memberId, 'class_reminder', 
        'Class Spot Available', 
        `A spot has opened in ${gymClass.name}. You've been automatically enrolled.`);
      return true;
    }
    return false;
  }

  // Payment methods
  createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Payment {
    const newPayment: Payment = {
      ...payment,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    this.payments.push(newPayment);
    return newPayment;
  }

  getMemberPayments(memberId: string): Payment[] {
    return this.payments.filter(p => p.memberId === memberId);
  }

  updatePaymentStatus(paymentId: string, status: Payment['status'], transactionId?: string): Payment | null {
    const payment = this.payments.find(p => p.id === paymentId);
    if (!payment) return null;
    payment.status = status;
    if (transactionId) payment.transactionId = transactionId;
    return payment;
  }

  // Email notification methods
  createNotification(memberId: string, type: EmailNotification['type'], subject: string, body: string): EmailNotification {
    const notification: EmailNotification = {
      id: Date.now().toString(),
      memberId,
      type,
      subject,
      body,
      sent: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.push(notification);
    // In production, send email here
    return notification;
  }

  getMemberNotifications(memberId: string): EmailNotification[] {
    return this.notifications
      .filter(n => n.memberId === memberId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markNotificationSent(notificationId: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification) return false;
    notification.sent = true;
    notification.sentAt = new Date().toISOString();
    return true;
  }

  // Phase 2: Exercise methods
  getAllExercises(): Exercise[] {
    return this.exercises;
  }

  getExercise(id: string): Exercise | undefined {
    return this.exercises.find(e => e.id === id);
  }

  addExercise(exercise: Omit<Exercise, 'id'>): Exercise {
    const newExercise: Exercise = {
      ...exercise,
      id: Date.now().toString(),
    };
    this.exercises.push(newExercise);
    return newExercise;
  }

  updateExercise(id: string, updates: Partial<Exercise>): Exercise | null {
    const index = this.exercises.findIndex(e => e.id === id);
    if (index === -1) return null;
    this.exercises[index] = { ...this.exercises[index], ...updates };
    return this.exercises[index];
  }

  deleteExercise(id: string): boolean {
    const index = this.exercises.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.exercises.splice(index, 1);
    return true;
  }

  // Phase 2: Workout Plan methods
  getAllWorkoutPlans(): WorkoutPlan[] {
    return this.workoutPlans;
  }

  getWorkoutPlan(id: string): WorkoutPlan | undefined {
    return this.workoutPlans.find(p => p.id === id);
  }

  getMemberWorkoutPlans(memberId: string): WorkoutPlan[] {
    return this.workoutPlans.filter(p => p.memberId === memberId);
  }

  addWorkoutPlan(plan: Omit<WorkoutPlan, 'id' | 'createdAt'>): WorkoutPlan {
    const newPlan: WorkoutPlan = {
      ...plan,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    this.workoutPlans.push(newPlan);
    return newPlan;
  }

  updateWorkoutPlan(id: string, updates: Partial<WorkoutPlan>): WorkoutPlan | null {
    const index = this.workoutPlans.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.workoutPlans[index] = { ...this.workoutPlans[index], ...updates };
    return this.workoutPlans[index];
  }

  deleteWorkoutPlan(id: string): boolean {
    const index = this.workoutPlans.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.workoutPlans.splice(index, 1);
    // Also delete associated workouts
    this.workouts = this.workouts.filter(w => w.workoutPlanId !== id);
    return true;
  }

  // Phase 2: Workout methods
  getAllWorkouts(): Workout[] {
    return this.workouts;
  }

  getWorkout(id: string): Workout | undefined {
    return this.workouts.find(w => w.id === id);
  }

  getMemberWorkouts(memberId: string): Workout[] {
    return this.workouts.filter(w => w.memberId === memberId);
  }

  getWorkoutPlanWorkouts(workoutPlanId: string): Workout[] {
    return this.workouts.filter(w => w.workoutPlanId === workoutPlanId);
  }

  addWorkout(workout: Omit<Workout, 'id'>): Workout {
    const newWorkout: Workout = {
      ...workout,
      id: Date.now().toString(),
    };
    this.workouts.push(newWorkout);
    return newWorkout;
  }

  updateWorkout(id: string, updates: Partial<Workout>): Workout | null {
    const index = this.workouts.findIndex(w => w.id === id);
    if (index === -1) return null;
    this.workouts[index] = { ...this.workouts[index], ...updates };
    return this.workouts[index];
  }

  deleteWorkout(id: string): boolean {
    const index = this.workouts.findIndex(w => w.id === id);
    if (index === -1) return false;
    this.workouts.splice(index, 1);
    // Also delete associated progress
    this.workoutProgress = this.workoutProgress.filter(p => p.workoutId !== id);
    return true;
  }

  // Phase 2: Workout Progress methods
  getWorkoutProgress(workoutId: string): WorkoutProgress[] {
    return this.workoutProgress.filter(p => p.workoutId === workoutId);
  }

  getMemberWorkoutProgress(memberId: string): WorkoutProgress[] {
    return this.workoutProgress.filter(p => p.memberId === memberId);
  }

  addWorkoutProgress(progress: Omit<WorkoutProgress, 'id' | 'completedAt'>): WorkoutProgress {
    const newProgress: WorkoutProgress = {
      ...progress,
      id: Date.now().toString(),
      completedAt: new Date().toISOString(),
    };
    this.workoutProgress.push(newProgress);
    return newProgress;
  }

  // Phase 2: Workout Template methods
  getAllWorkoutTemplates(): WorkoutTemplate[] {
    return this.workoutTemplates;
  }

  getWorkoutTemplate(id: string): WorkoutTemplate | undefined {
    return this.workoutTemplates.find(t => t.id === id);
  }

  addWorkoutTemplate(template: Omit<WorkoutTemplate, 'id'>): WorkoutTemplate {
    const newTemplate: WorkoutTemplate = {
      ...template,
      id: Date.now().toString(),
    };
    this.workoutTemplates.push(newTemplate);
    return newTemplate;
  }

  updateWorkoutTemplate(id: string, updates: Partial<WorkoutTemplate>): WorkoutTemplate | null {
    const index = this.workoutTemplates.findIndex(t => t.id === id);
    if (index === -1) return null;
    this.workoutTemplates[index] = { ...this.workoutTemplates[index], ...updates };
    return this.workoutTemplates[index];
  }

  deleteWorkoutTemplate(id: string): boolean {
    const index = this.workoutTemplates.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.workoutTemplates.splice(index, 1);
    return true;
  }

  // Phase 2: AI Workout Generation (rule-based implementation - can integrate AI later)
  generateWorkoutPlan(params: {
    memberId: string;
    goal: WorkoutPlan['goal'];
    difficulty: WorkoutPlan['difficulty'];
    duration: number;
    frequency: number;
    equipment?: string[];
    limitations?: string[];
  }): WorkoutPlan {
    // Use new athlete-intelligent generator
    const { generateAthleteWorkoutPlan } = require('./athlete-workout-generator');
    const { plan, workouts }: { plan: WorkoutPlan; workouts: Workout[] } = generateAthleteWorkoutPlan(params, this.exercises);
    
    // Add plan to store
    this.workoutPlans.push(plan);
    
    // Add all workouts to store
    workouts.forEach((workout: Workout) => {
      this.workouts.push(workout);
    });
    
    return plan;
  }

  // Phase 3: Recipe methods
  getAllRecipes(): Recipe[] {
    // Verify all recipes are loaded
    if (this.recipes.length !== 45) {
      console.warn(`Expected 45 recipes but found ${this.recipes.length}`);
    }
    return this.recipes;
  }

  getRecipe(id: string): Recipe | undefined {
    return this.recipes.find(r => r.id === id);
  }

  addRecipe(recipe: Omit<Recipe, 'id'>): Recipe {
    const newRecipe: Recipe = {
      ...recipe,
      id: Date.now().toString(),
    };
    this.recipes.push(newRecipe);
    return newRecipe;
  }

  updateRecipe(id: string, updates: Partial<Recipe>): Recipe | null {
    const index = this.recipes.findIndex(r => r.id === id);
    if (index === -1) return null;
    this.recipes[index] = { ...this.recipes[index], ...updates };
    return this.recipes[index];
  }

  deleteRecipe(id: string): boolean {
    const index = this.recipes.findIndex(r => r.id === id);
    if (index === -1) return false;
    this.recipes.splice(index, 1);
    return true;
  }

  // Phase 3: Nutrition Plan methods
  getAllNutritionPlans(): NutritionPlan[] {
    return this.nutritionPlans;
  }

  getNutritionPlan(id: string): NutritionPlan | undefined {
    return this.nutritionPlans.find(p => p.id === id);
  }

  getMemberNutritionPlans(memberId: string): NutritionPlan[] {
    return this.nutritionPlans.filter(p => p.memberId === memberId);
  }

  addNutritionPlan(plan: Omit<NutritionPlan, 'id' | 'createdAt'>): NutritionPlan {
    const newPlan: NutritionPlan = {
      ...plan,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    this.nutritionPlans.push(newPlan);
    return newPlan;
  }

  updateNutritionPlan(id: string, updates: Partial<NutritionPlan>): NutritionPlan | null {
    const index = this.nutritionPlans.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.nutritionPlans[index] = { ...this.nutritionPlans[index], ...updates };
    return this.nutritionPlans[index];
  }

  deleteNutritionPlan(id: string): boolean {
    const index = this.nutritionPlans.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.nutritionPlans.splice(index, 1);
    // Also delete associated daily meal plans
    this.dailyMealPlans = this.dailyMealPlans.filter(mp => mp.nutritionPlanId !== id);
    return true;
  }

  // Phase 3: Daily Meal Plan methods
  getDailyMealPlans(nutritionPlanId: string): DailyMealPlan[] {
    return this.dailyMealPlans.filter(mp => mp.nutritionPlanId === nutritionPlanId);
  }

  getMemberDailyMealPlans(memberId: string): DailyMealPlan[] {
    return this.dailyMealPlans.filter(mp => mp.memberId === memberId);
  }

  addDailyMealPlan(mealPlan: Omit<DailyMealPlan, 'id'>): DailyMealPlan {
    const newMealPlan: DailyMealPlan = {
      ...mealPlan,
      id: Date.now().toString(),
    };
    this.dailyMealPlans.push(newMealPlan);
    return newMealPlan;
  }

  updateDailyMealPlan(id: string, updates: Partial<DailyMealPlan>): DailyMealPlan | null {
    const index = this.dailyMealPlans.findIndex(mp => mp.id === id);
    if (index === -1) return null;
    this.dailyMealPlans[index] = { ...this.dailyMealPlans[index], ...updates };
    return this.dailyMealPlans[index];
  }

  // Phase 3: Macro Calculator (uses scientifically-backed nutrition.ts)
  calculateMacros(params: {
    gender: 'male' | 'female';
    age: number;
    height: number; // in cm
    weight: number; // in kg
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    goal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'performance' | 'general_health';
  }): MacroTargets {
    // Use the new nutrition calculation library for consistent, accurate calculations
    const targets = calculateTargets({
      sex: params.gender as Sex,
      age: params.age,
      heightCm: params.height,
      weightKg: params.weight,
      activityLevel: params.activityLevel as ActivityLevel,
      goal: params.goal as Goal,
    });

    // Convert to MacroTargets format (old format for compatibility)
    return {
      calories: targets.calories,
      protein: targets.protein_g,
      carbohydrates: targets.carbs_g,
      fats: targets.fat_g,
    };
  }

  // Helper function to normalize macros to match target calories
  // Now uses the scientific calculation from nutrition.ts
  private normalizeMacros(
    currentProtein: number,
    currentCarbs: number,
    currentFats: number,
    targetCalories: number
  ): { protein: number; carbs: number; fats: number; calories: number } {
    // Use the roundMacrosConsistently function from nutrition.ts
    // This ensures mathematical consistency
    const { roundMacrosConsistently } = require('./nutrition');
    
    const normalized = roundMacrosConsistently({
      targetCalories,
      protein_g: currentProtein,
      carbs_g: currentCarbs,
      fat_g: currentFats,
    });
    
    return {
      protein: normalized.protein_g,
      carbs: normalized.carbs_g,
      fats: normalized.fat_g,
      calories: normalized.caloriesFromMacros,
    };
  }

  // Phase 3: Generate Nutrition Plan (rule-based - can integrate AI later)
  generateNutritionPlan(params: {
    memberId: string;
    goal: NutritionPlan['goal'];
    gender: 'male' | 'female';
    age: number;
    height: number;
    weight: number;
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    duration: number;
    dietaryRestrictions?: string[];
    preferences?: string[];
  }): NutritionPlan {
    // Calculate macro targets
    const macroTargets = this.calculateMacros({
      gender: params.gender,
      age: params.age,
      height: params.height,
      weight: params.weight,
      activityLevel: params.activityLevel,
      goal: params.goal,
    });

    // Create nutrition plan
    const plan = this.addNutritionPlan({
      memberId: params.memberId,
      name: `${params.goal.charAt(0).toUpperCase() + params.goal.slice(1).replace('_', ' ')} Nutrition Plan`,
      description: `Personalized ${params.goal.replace('_', ' ')} nutrition plan with ${macroTargets.calories} calories/day. ${params.dietaryRestrictions?.length ? `Restrictions: ${params.dietaryRestrictions.join(', ')}.` : ''}`,
      goal: params.goal,
      macroTargets,
      duration: params.duration,
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      createdBy: 'ai',
      dietaryRestrictions: params.dietaryRestrictions,
      preferences: params.preferences,
    });

    // Filter available recipes by dietary restrictions
    const availableRecipes = this.recipes.filter(r => {
      if (params.dietaryRestrictions) {
        if (params.dietaryRestrictions.includes('vegetarian') && !r.tags.includes('vegetarian') && !r.tags.includes('vegan')) return false;
        if (params.dietaryRestrictions.includes('vegan') && !r.tags.includes('vegan')) return false;
      }
      return true;
    });

    // Safety check: ensure we have recipes to work with
    if (availableRecipes.length === 0) {
      throw new Error('No recipes available matching the dietary restrictions. Cannot generate meal plan.');
    }

    // Separate recipes by meal type
    const breakfastRecipes = availableRecipes.filter(r => r.tags.includes('breakfast'));
    const lunchDinnerRecipes = availableRecipes.filter(r => 
      !r.tags.includes('breakfast') && !r.tags.includes('smoothie') && !r.tags.includes('snack')
    );
    const snackRecipes = availableRecipes.filter(r => 
      r.tags.includes('smoothie') || r.tags.includes('snack') || r.tags.includes('quick')
    );

    // Track used recipes across the week to ensure variety
    const usedBreakfastIds = new Set<string>();
    const usedLunchIds = new Set<string>();
    const usedDinnerIds = new Set<string>();
    const usedSnackIds = new Set<string>();
    
    // Collect all meals for the plan (for API response)
    const allMeals: Meal[] = [];

    // Helper function to select a unique recipe
    const selectUniqueRecipe = (
      pool: typeof availableRecipes,
      usedIds: Set<string>,
      excludeIds: Set<string> = new Set()
    ): typeof availableRecipes[0] | null => {
      // First try: unused recipes
      const unused = pool.filter(r => !usedIds.has(r.id) && !excludeIds.has(r.id));
      if (unused.length > 0) {
        const selected = unused[Math.floor(Math.random() * unused.length)];
        usedIds.add(selected.id);
        return selected;
      }
      
      // Second try: allow repeats but still exclude same-day conflicts
      const available = pool.filter(r => !excludeIds.has(r.id));
      if (available.length > 0) {
        const selected = available[Math.floor(Math.random() * available.length)];
        // Track it as used even though it's a repeat
        usedIds.add(selected.id);
        return selected;
      }
      
      // Last resort: any recipe from pool (even if used today)
      if (pool.length > 0) {
        const selected = pool[Math.floor(Math.random() * pool.length)];
        usedIds.add(selected.id);
        return selected;
      }
      
      return null;
    };

    // Macro adjustment helpers (small portions to meet targets)
    const macroAdjusters = [
      { name: 'Extra Brown Rice (1/2 cup)', calories: 110, protein: 2, carbs: 23, fats: 1 },
      { name: 'Olive Oil (1 tbsp)', calories: 120, protein: 0, carbs: 0, fats: 14 },
      { name: 'Greek Yogurt (100g)', calories: 60, protein: 10, carbs: 4, fats: 0 },
      { name: 'Banana', calories: 105, protein: 1, carbs: 27, fats: 0 },
      { name: 'Almonds (1 oz)', calories: 160, protein: 6, carbs: 6, fats: 14 },
      { name: 'Sweet Potato (100g)', calories: 90, protein: 2, carbs: 21, fats: 0 },
      { name: 'Protein Shake', calories: 120, protein: 24, carbs: 3, fats: 2 },
    ];

    // Generate daily meal plans for the duration
    const startDate = new Date(plan.startDate);
    for (let i = 0; i < params.duration; i++) {
      const mealPlanDate = new Date(startDate);
      mealPlanDate.setDate(startDate.getDate() + i);

      // Track recipes used within this day to prevent duplicates
      const todayRecipeIds = new Set<string>();

      const meals: Meal[] = [];
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFats = 0;

      // Select breakfast (must be unique within day and prefer unused)
      const breakfast = selectUniqueRecipe(
        breakfastRecipes.length > 0 ? breakfastRecipes : availableRecipes,
        usedBreakfastIds,
        todayRecipeIds
      );
      
      if (breakfast) {
        todayRecipeIds.add(breakfast.id);
        meals.push({
          id: `meal-${plan.id}-${i}-breakfast`,
          name: breakfast.name,
          mealType: 'breakfast' as const,
          recipeId: breakfast.id,
          calories: breakfast.calories,
          protein: breakfast.protein_g,
          carbohydrates: breakfast.carbs_g,
          fats: breakfast.fat_g,
          time: '08:00',
        });
        totalCalories += breakfast.calories;
        totalProtein += breakfast.protein_g;
        totalCarbs += breakfast.carbs_g;
        totalFats += breakfast.fat_g;
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(`Day ${i + 1}: No breakfast recipe available`);
      }

      // Select lunch (must be unique within day and different from dinner)
      const lunch = selectUniqueRecipe(
        lunchDinnerRecipes.length > 0 ? lunchDinnerRecipes : availableRecipes,
        usedLunchIds,
        todayRecipeIds
      );
      
      if (lunch) {
        todayRecipeIds.add(lunch.id);
        meals.push({
          id: `meal-${plan.id}-${i}-lunch`,
          name: lunch.name,
          mealType: 'lunch' as const,
          recipeId: lunch.id,
          calories: lunch.calories,
          protein: lunch.protein_g,
          carbohydrates: lunch.carbs_g,
          fats: lunch.fat_g,
          time: '13:00',
        });
        totalCalories += lunch.calories;
        totalProtein += lunch.protein_g;
        totalCarbs += lunch.carbs_g;
        totalFats += lunch.fat_g;
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(`Day ${i + 1}: No lunch recipe available`);
      }

      // Select dinner (must be unique within day, different from lunch)
      const dinner = selectUniqueRecipe(
        lunchDinnerRecipes.length > 0 ? lunchDinnerRecipes : availableRecipes,
        usedDinnerIds,
        todayRecipeIds
      );
      
      if (dinner) {
        todayRecipeIds.add(dinner.id);
        meals.push({
          id: `meal-${plan.id}-${i}-dinner`,
          name: dinner.name,
          mealType: 'dinner' as const,
          recipeId: dinner.id,
          calories: dinner.calories,
          protein: dinner.protein_g,
          carbohydrates: dinner.carbs_g,
          fats: dinner.fat_g,
          time: '19:00',
        });
        totalCalories += dinner.calories;
        totalProtein += dinner.protein_g;
        totalCarbs += dinner.carbs_g;
        totalFats += dinner.fat_g;
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(`Day ${i + 1}: No dinner recipe available`);
      }

      // Add snacks/adjusters to meet calorie target (within ±2% or ±50 kcal)
      const calorieTarget = macroTargets.calories;
      const calorieTolerance = Math.min(calorieTarget * 0.02, 50);
      const calorieDeficit = calorieTarget - totalCalories;

      if (calorieDeficit > calorieTolerance) {
        // Need to add calories - add snack or adjusters
        const snack = selectUniqueRecipe(
          snackRecipes.length > 0 ? snackRecipes : availableRecipes,
          usedSnackIds,
          todayRecipeIds
        );
        
        if (snack && snack.calories <= calorieDeficit + calorieTolerance) {
          todayRecipeIds.add(snack.id);
          meals.push({
            id: `meal-${plan.id}-${i}-snack`,
            name: snack.name,
            mealType: 'snack' as const,
            recipeId: snack.id,
            calories: snack.calories,
            protein: snack.protein_g,
            carbohydrates: snack.carbs_g,
            fats: snack.fat_g,
            time: '16:00',
          });
          totalCalories += snack.calories;
          totalProtein += snack.protein_g;
          totalCarbs += snack.carbs_g;
          totalFats += snack.fat_g;
        }

        // Still need more calories? Add small macro adjusters
        const remainingDeficit = calorieTarget - totalCalories;
        if (remainingDeficit > calorieTolerance) {
          // Try to add one adjuster that fits
          const suitableAdjuster = macroAdjusters.find(adj => 
            adj.calories <= remainingDeficit + calorieTolerance * 2
          );
          
          if (suitableAdjuster) {
            meals.push({
              id: `meal-${plan.id}-${i}-adjuster`,
              name: suitableAdjuster.name,
              mealType: 'snack' as const,
              calories: suitableAdjuster.calories,
              protein: suitableAdjuster.protein,
              carbohydrates: suitableAdjuster.carbs,
              fats: suitableAdjuster.fats,
              time: '20:00',
            });
            totalCalories += suitableAdjuster.calories;
            totalProtein += suitableAdjuster.protein;
            totalCarbs += suitableAdjuster.carbs;
            totalFats += suitableAdjuster.fats;
          }
        }
      }

      // Store the day with computed totals (source of truth) and target totals
      this.addDailyMealPlan({
        nutritionPlanId: plan.id,
        memberId: params.memberId,
        date: mealPlanDate.toISOString().split('T')[0],
        meals: meals,
        // Computed totals = sum of meals (this is what UI displays)
        totalCalories: Math.round(totalCalories),
        totalProtein: Math.round(totalProtein),
        totalCarbohydrates: Math.round(totalCarbs),
        totalFats: Math.round(totalFats),
        // Store targets for reference
        targetCalories: macroTargets.calories,
        targetProtein: macroTargets.protein,
        targetCarbohydrates: macroTargets.carbohydrates,
        targetFats: macroTargets.fats,
        status: 'planned',
      });
      
      // Collect meals for the plan's meals array
      allMeals.push(...meals);
    }
    
    // Attach all meals to the plan for API response
    const planWithMeals: NutritionPlan = {
      ...plan,
      meals: allMeals,
    };
    
    return planWithMeals;
  }

  // Phase 4: Habit methods
  getAllHabits(): Habit[] {
    return this.habits;
  }

  getMemberHabits(memberId: string): Habit[] {
    return this.habits.filter(h => h.memberId === memberId && h.status === 'active');
  }

  getHabit(id: string): Habit | undefined {
    return this.habits.find(h => h.id === id);
  }

  addHabit(habit: Omit<Habit, 'id' | 'createdAt'>): Habit {
    const newHabit: Habit = {
      ...habit,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.habits.push(newHabit);
    return newHabit;
  }

  updateHabit(id: string, updates: Partial<Habit>): Habit | null {
    const index = this.habits.findIndex(h => h.id === id);
    if (index === -1) return null;
    this.habits[index] = { ...this.habits[index], ...updates };
    return this.habits[index];
  }

  deleteHabit(id: string): boolean {
    const index = this.habits.findIndex(h => h.id === id);
    if (index === -1) return false;
    const memberId = this.habits[index].memberId;
    this.habits.splice(index, 1);
    // Keep another member's legacy record if old timestamp IDs collided.
    this.habitEntries = this.habitEntries.filter(e => e.habitId !== id || e.memberId !== memberId);
    return true;
  }

  // Phase 4: Habit Entry methods
  getHabitEntries(habitId: string): HabitEntry[] {
    return this.habitEntries.filter(e => e.habitId === habitId);
  }

  getMemberHabitEntries(memberId: string): HabitEntry[] {
    return this.habitEntries.filter(e => e.memberId === memberId);
  }

  getHabitEntryByDate(habitId: string, date: string): HabitEntry | undefined {
    return this.habitEntries.find(e => e.habitId === habitId && e.date === date);
  }

  addHabitEntry(entry: Omit<HabitEntry, 'id'>): HabitEntry {
    const newEntry: HabitEntry = {
      ...entry,
      id: randomUUID(),
    };
    this.habitEntries.push(newEntry);
    return newEntry;
  }

  updateHabitEntry(id: string, updates: Partial<HabitEntry>, scope?: { memberId: string; habitId: string }): HabitEntry | null {
    const index = this.habitEntries.findIndex(e => e.id === id && (!scope || (e.memberId === scope.memberId && e.habitId === scope.habitId)));
    if (index === -1) return null;
    this.habitEntries[index] = { ...this.habitEntries[index], ...updates };
    return this.habitEntries[index];
  }

  // Phase 4: Whoop Connection methods
  getWhoopConnection(memberId: string): WhoopConnection | undefined {
    return this.whoopConnections.find(c => c.memberId === memberId);
  }

  addWhoopConnection(connection: Omit<WhoopConnection, 'id'>): WhoopConnection {
    const newConnection: WhoopConnection = {
      ...connection,
      id: Date.now().toString(),
    };
    // Remove existing connection for this member
    this.whoopConnections = this.whoopConnections.filter(c => c.memberId !== connection.memberId);
    this.whoopConnections.push(newConnection);
    return newConnection;
  }

  updateWhoopConnection(memberId: string, updates: Partial<WhoopConnection>): WhoopConnection | null {
    const connection = this.whoopConnections.find(c => c.memberId === memberId);
    if (!connection) return null;
    const index = this.whoopConnections.indexOf(connection);
    this.whoopConnections[index] = { ...connection, ...updates };
    return this.whoopConnections[index];
  }

  deleteWhoopConnection(memberId: string): boolean {
    const index = this.whoopConnections.findIndex(c => c.memberId === memberId);
    if (index === -1) return false;
    this.whoopConnections.splice(index, 1);
    // Also delete associated data
    this.whoopData = this.whoopData.filter(d => d.memberId !== memberId);
    return true;
  }

  // Phase 4: Whoop Data methods
  getWhoopData(memberId: string, startDate?: string, endDate?: string): WhoopData[] {
    let data = this.whoopData.filter(d => d.memberId === memberId);
    if (startDate) {
      data = data.filter(d => d.date >= startDate);
    }
    if (endDate) {
      data = data.filter(d => d.date <= endDate);
    }
    return data.sort((a, b) => b.date.localeCompare(a.date));
  }

  addWhoopData(data: Omit<WhoopData, 'id'>): WhoopData {
    const newData: WhoopData = {
      ...data,
      id: Date.now().toString(),
    };
    // Remove existing data for same date
    this.whoopData = this.whoopData.filter(d => !(d.memberId === data.memberId && d.date === data.date));
    this.whoopData.push(newData);
    return newData;
  }

  // Health Score Calculation Methods
  calculateHealthScore(memberId: string): {
    total: number;
    workoutScore: number;
    dietScore: number;
    habitScore: number;
    sleepScore: number;
    workoutCount: number;
    workoutIntensity: number;
    dietQuality: number;
    habitCompletion: number;
    sleepQuality: number;
  } {
    // Get member workouts from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const memberWorkouts = this.workouts.filter(w => 
      w.memberId === memberId && 
      new Date(w.date) >= thirtyDaysAgo &&
      w.status === 'completed'
    );

    // Calculate workout score (0-30 points, 30% of total)
    const workoutCount = memberWorkouts.length;
    const targetWorkouts = 12; // 3 per week * 4 weeks
    const workoutFrequencyScore = Math.min(15, (workoutCount / targetWorkouts) * 15);
    
    // Calculate workout intensity (average duration and exercise count)
    let totalIntensity = 0;
    let avgIntensity = 0;
    if (memberWorkouts.length > 0) {
      const intensities = memberWorkouts.map(w => {
        const exerciseCount = w.exercises.length;
        const duration = w.duration || 30; // default 30 min
        return (exerciseCount * 10) + (duration / 60 * 20); // max 100 per workout
      });
      totalIntensity = intensities.reduce((sum, i) => sum + i, 0);
      avgIntensity = totalIntensity / memberWorkouts.length;
    }
    const workoutIntensityScore = Math.min(15, (avgIntensity / 100) * 15);
    const workoutScore = workoutFrequencyScore + workoutIntensityScore;
    const workoutIntensity = avgIntensity;

    // Calculate diet score (0-30 points, 30% of total)
    const nutritionPlans = this.getMemberNutritionPlans(memberId);
    const activePlan = nutritionPlans.find(p => p.status === 'active');
    let dietScore = 0;
    let dietQuality = 0;
    
    if (activePlan) {
      const dailyPlans = this.getDailyMealPlans(activePlan.id);
      const recentPlans = dailyPlans.filter(dp => 
        new Date(dp.date) >= thirtyDaysAgo
      );
      
      if (recentPlans.length > 0) {
        // Calculate adherence to macro targets
        const adherenceScores = recentPlans.map(dp => {
          const proteinDiff = Math.abs(dp.totalProtein - activePlan.macroTargets.protein) / activePlan.macroTargets.protein;
          const carbDiff = Math.abs(dp.totalCarbohydrates - activePlan.macroTargets.carbohydrates) / activePlan.macroTargets.carbohydrates;
          const fatDiff = Math.abs(dp.totalFats - activePlan.macroTargets.fats) / activePlan.macroTargets.fats;
          const avgDiff = (proteinDiff + carbDiff + fatDiff) / 3;
          return Math.max(0, 100 - (avgDiff * 100));
        });
        dietQuality = adherenceScores.reduce((sum, s) => sum + s, 0) / adherenceScores.length;
        dietScore = (dietQuality / 100) * 30;
      }
    } else {
      // No active plan, give baseline score
      dietScore = 6;
      dietQuality = 20;
    }

    // Calculate habit score (0-15 points, 15% of total)
    const memberHabits = this.getMemberHabits(memberId);
    let habitScore = 0;
    let habitCompletion = 0;
    
    if (memberHabits.length > 0) {
      const habitEntries = this.getMemberHabitEntries(memberId);
      const recentEntries = habitEntries.filter(e => 
        new Date(e.date) >= thirtyDaysAgo
      );
      
      // Calculate completion rate
      const totalPossibleEntries = memberHabits.length * 30; // 30 days
      const completedEntries = recentEntries.filter(e => e.completed).length;
      habitCompletion = totalPossibleEntries > 0 
        ? (completedEntries / totalPossibleEntries) * 100 
        : 0;
      habitScore = (habitCompletion / 100) * 15;
    } else {
      habitScore = 3;
      habitCompletion = 20;
    }

    // Calculate sleep score (0-25 points, 25% of total) from Whoop data
    const whoopConnection = this.getWhoopConnection(memberId);
    let sleepScore = 0;
    let sleepQuality = 0;
    
    if (whoopConnection && whoopConnection.connected) {
      const whoopData = this.getWhoopData(memberId, thirtyDaysAgo.toISOString().split('T')[0]);
      const recentSleepData = whoopData.filter(d => d.sleep);
      
      if (recentSleepData.length > 0) {
        const sleepScores = recentSleepData.map(d => {
          if (d.sleep?.sleepScore) {
            return d.sleep.sleepScore;
          }
          // Calculate from sleep efficiency and duration
          const efficiency = d.sleep?.sleepEfficiency ?? 85;
          const totalSleep = d.sleep?.totalSleep ?? 0;
          const targetSleep = 8 * 60; // 8 hours in minutes
          const durationScore = Math.min(100, (totalSleep / targetSleep) * 100);
          return (efficiency * 0.6) + (durationScore * 0.4);
        });
        sleepQuality = sleepScores.reduce((sum, s) => sum + s, 0) / sleepScores.length;
        sleepScore = (sleepQuality / 100) * 25;
      } else {
        sleepScore = 5;
        sleepQuality = 20;
      }
    } else {
      // No Whoop connection, give baseline score
      sleepScore = 5;
      sleepQuality = 20;
    }

    // Total score (0-100)
    const total = Math.round(workoutScore + dietScore + habitScore + sleepScore);

    return {
      total,
      workoutScore,
      dietScore,
      habitScore,
      sleepScore,
      workoutCount,
      workoutIntensity,
      dietQuality,
      habitCompletion,
      sleepQuality,
    };
  }

  getFriendsHealthScores(memberId: string): Array<{ id: string; name: string; score: number }> {
    // Get all active members (as "friends" for comparison)
    const allMembers = this.getAllMembers().filter(m => m.status === 'active');
    
    const friendsScores = allMembers.map(member => {
      const healthScore = this.calculateHealthScore(member.id);
      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        score: healthScore.total,
      };
    });

    // Sort by score descending
    return friendsScores.sort((a, b) => b.score - a.score);
  }
}

// Export password utilities
export { hashPassword, verifyPassword };

// Export singleton instance with global caching to persist across HMR
// This ensures the same store instance is used across all API routes in development
const globalForStore = global as unknown as { store: DataStore | undefined };

export const store = globalForStore.store ?? new DataStore();

if (process.env.NODE_ENV !== 'production') {
  globalForStore.store = store;
}
