import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

export const tripSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(1000).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  totalBudget: z.coerce.number().min(0, 'Budget cannot be negative').max(100000, 'Budget is too large for local demo'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'AED', 'AZN']).default('USD'),
  travelerCount: z.coerce.number().int().min(1).max(50).default(1),
  travelStyle: z.enum(['BUDGET', 'MODERATE', 'LUXURY', 'BACKPACKER', 'BUSINESS', 'ADVENTURE', 'FAMILY', 'CULTURAL', 'RELAXATION']).default('MODERATE'),
  notes: z.string().max(120000).optional(),
  isPublic: z.boolean().default(false),
  destinations: z.array(z.object({
    name: z.string().min(1),
    country: z.string().min(1),
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
  })).min(1, 'At least one destination is required'),
}).refine(data => !Number.isNaN(new Date(data.startDate).getTime()), {
  message: 'Start date must be valid', path: ['startDate'],
}).refine(data => !Number.isNaN(new Date(data.endDate).getTime()), {
  message: 'End date must be valid', path: ['endDate'],
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date must be the same day or after start date', path: ['endDate'],
});

export const expenseSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0').max(100000, 'Expense amount is too large for local demo'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'AED', 'AZN']).default('USD'),
  category: z.enum(['ACCOMMODATION', 'TRANSPORT', 'FOOD', 'ACTIVITIES', 'SHOPPING', 'MISCELLANEOUS']),
  description: z.string().trim().min(1, 'Description is required').max(200),
  date: z.string().refine(v => !Number.isNaN(new Date(v).getTime()), 'Expense date must be valid'),
  notes: z.string().max(5000).optional(),
});

export const bookingSchema = z.object({
  type: z.enum(['HOTEL', 'FLIGHT', 'TRAIN', 'BUS', 'RESTAURANT', 'TOUR', 'CAR_RENTAL', 'OTHER']),
  provider: z.string().min(1, 'Provider is required'),
  bookingRef: z.string().optional(),
  url: z.string().optional().or(z.literal('')), // Local demo: booking link is optional and not shown in UI
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).default('PENDING'),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  amount: z.coerce.number().min(0, 'Amount cannot be negative').max(100000, 'Booking amount is too large for local demo').optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'AED', 'AZN']).default('USD'),
  notes: z.string().max(5000).optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
  tripId: z.string().optional(),
  itineraryItemId: z.string().optional(),
  parentId: z.string().optional(),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
});

export const preferencesSchema = z.object({
  interests: z.array(z.string()),
  travelStyle: z.enum(['BUDGET', 'MODERATE', 'LUXURY', 'BACKPACKER', 'BUSINESS', 'ADVENTURE', 'FAMILY', 'CULTURAL', 'RELAXATION']),
  budgetStyle: z.string(),
  preferredTransport: z.array(z.string()),
  travelPace: z.enum(['SLOW', 'MODERATE', 'FAST', 'PACKED']),
  accommodationType: z.enum(['HOTEL', 'HOSTEL', 'AIRBNB', 'RESORT', 'BOUTIQUE', 'CAMPING']),
  dietaryRestrictions: z.array(z.string()),
  notificationsEnabled: z.boolean(),
  emailNotifications: z.boolean(),
  quietMode: z.boolean(),
});

export const itineraryGenerateSchema = z.object({
  tripId: z.string(),
  preferences: z.object({
    interests: z.array(z.string()).optional(),
    pace: z.string().optional(),
    budget: z.number().optional(),
    constraints: z.array(z.string()).optional(),
  }).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TripInput = z.infer<typeof tripSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
