// Business Types
export interface Business {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: 'salon' | 'spa' | 'nails' | 'beauty' | 'massage' | 'aesthetics' | 'other';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  settings?: BusinessSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessSettings {
  timezone: string;
  currency: string;
  bookingBuffer: number; // minutes
  cancellationPolicy: string;
  depositRequired: boolean;
  depositPercentage: number;
  notifications: {
    email: boolean;
    sms: boolean;
  };
}

// Staff Types
export interface Staff {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  services: string[];
  schedule: StaffSchedule;
  status: 'active' | 'inactive';
  joinDate: Date;
  createdAt: Date;
}

export interface StaffSchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

// Appointment Types
export interface Appointment {
  id: string;
  businessId: string;
  clientId: string;
  staffId: string;
  serviceId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  payment: PaymentInfo;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInfo {
  method: 'card' | 'cash' | 'online';
  status: 'pending' | 'paid' | 'partial' | 'refunded';
  amount: number;
  depositAmount?: number;
  depositPaid: boolean;
  transactionId?: string;
}

// Service Types
export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string;
  category: string;
  duration: number; // minutes
  price: number;
  depositRequired: boolean;
  active: boolean;
  createdAt: Date;
}

// Client Types
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthday?: Date;
  notes?: string;
  loyaltyPoints: number;
  membershipLevel: 'bronze' | 'silver' | 'gold';
  totalVisits: number;
  totalSpent: number;
  lastVisit?: Date;
  createdAt: Date;
}

// Loyalty Types
export interface LoyaltyProgram {
  id: string;
  businessId: string;
  active: boolean;
  pointsPerDollar: number;
  tiers: LoyaltyTier[];
  rewards: LoyaltyReward[];
  rules: LoyaltyRule[];
}

export interface LoyaltyTier {
  name: string;
  minPoints: number;
  maxPoints: number;
  benefits: string[];
  discountPercentage: number;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  active: boolean;
  expiryDays?: number;
}

export interface LoyaltyRule {
  type: 'birthday' | 'referral' | 'review' | 'custom';
  points: number;
  description: string;
}

export interface ClientLoyalty {
  id: string;
  clientId: string;
  businessId: string;
  points: number;
  level: 'bronze' | 'silver' | 'gold';
  history: LoyaltyTransaction[];
  rewardsRedeemed: RewardRedemption[];
  updatedAt: Date;
}

export interface LoyaltyTransaction {
  date: Date;
  type: 'earned' | 'redeemed' | 'expired';
  points: number;
  reason: string;
  relatedId?: string;
}

export interface RewardRedemption {
  rewardId: string;
  rewardName: string;
  pointsUsed: number;
  redeemedAt: Date;
  usedAt?: Date;
  expiresAt?: Date;
}

// Consultation Types
export interface Consultation {
  id: string;
  businessId: string;
  clientId: string;
  staffId?: string;
  type: string;
  date: Date;
  startTime: string;
  duration: number; // minutes
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  meetingLink?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  createdAt: Date;
}

// Dashboard Stats Types
export interface DashboardStats {
  todayAppointments: number;
  todayRevenue: number;
  newClients: number;
  occupancyRate: number;
  weeklyTrend: {
    appointments: number;
    revenue: number;
  };
}

// Booking Form Types
export interface BookingFormData {
  serviceId: string;
  staffId: string | null;
  date: Date;
  time: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
}

// Authentication Types
export interface AuthUser {
  uid: string;
  email: string;
  businessId?: string;
  role: 'owner' | 'staff' | 'client';
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'appointment' | 'payment' | 'loyalty' | 'system';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
}


