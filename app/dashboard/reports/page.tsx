'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { formatPrice } from '@/lib/currency';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useToast } from '@/hooks/useToast';
import DashboardSidebar from '@/components/DashboardSidebar';
import SubscriptionGuard from '@/components/SubscriptionGuard';

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  );
}

function ReportsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'year' | 'all' | 'custom'>('30days');
  const [currency, setCurrency] = useState('GBP');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Financial Data
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [paidRevenue, setPaidRevenue] = useState(0);
  const [partialRevenue, setPartialRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [depositRevenue, setDepositRevenue] = useState(0);
  const [refundedAmount, setRefundedAmount] = useState(0);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  
  // Appointment Data
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [completedAppointments, setCompletedAppointments] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [cancelledAppointments, setCancelledAppointments] = useState(0);
  const [noShowAppointments, setNoShowAppointments] = useState(0);
  
  // Client Data
  const [totalClients, setTotalClients] = useState(0);
  const [newClients, setNewClients] = useState(0);
  const [returningClients, setReturningClients] = useState(0);
  const [onlineBookings, setOnlineBookings] = useState(0);
  const [avgClientSpend, setAvgClientSpend] = useState(0);
  const [topClients, setTopClients] = useState<any[]>([]);
  
  // Service Data
  const [topServices, setTopServices] = useState<any[]>([]);
  const [serviceRevenue, setServiceRevenue] = useState<any[]>([]);
  
  // Product Data
  const [productSales, setProductSales] = useState<any[]>([]);
  const [totalProductRevenue, setTotalProductRevenue] = useState(0);
  const [totalProductUnits, setTotalProductUnits] = useState(0);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  
  // Staff Data
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  
  // Time-based Data
  const [revenueByDay, setRevenueByDay] = useState<any[]>([]);
  const [appointmentsByDay, setAppointmentsByDay] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<any[]>([]);
  const [peakDays, setPeakDays] = useState<any[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
  
  // Payment Method Data
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  
  // Loyalty Data
  const [loyaltyStats, setLoyaltyStats] = useState({
    totalPoints: 0,
    redeemedPoints: 0,
    activeMembers: 0,
    pointsEarnedThisPeriod: 0,
    pointsRedeemedThisPeriod: 0,
    averagePointsPerClient: 0,
    topEarners: [] as any[],
    recentEarnings: [] as any[],
    recentRedemptions: [] as any[],
  });

  // Gift Voucher Data
  const [giftVoucherStats, setGiftVoucherStats] = useState({
    totalVouchers: 0,
    totalValue: 0,
    redeemedVouchers: 0,
    redeemedValue: 0,
    pendingVouchers: 0,
    pendingValue: 0,
    expiredVouchers: 0,
    expiredValue: 0,
  });

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user, dateRange, customStartDate, customEndDate]);

  const getDateRangeFilter = () => {
    const now = new Date();
    
    if (dateRange === 'custom') {
      if (customStartDate) {
        return new Date(customStartDate);
      }
      return new Date(0);
    }
    
    const ranges: Record<string, Date> = {
      '7days': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30days': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90days': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      'year': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      'all': new Date(0),
    };
    return ranges[dateRange];
  };

  const getEndDateFilter = () => {
    if (dateRange === 'custom' && customEndDate) {
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      return endDate;
    }
    return new Date(); // Default to now
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const startDate = getDateRangeFilter();
      const endDate = getEndDateFilter();

      // Fetch business data for currency
      const businessDoc = await getDocs(query(collection(db, 'businesses'), where('__name__', '==', user!.uid)));
      if (!businessDoc.empty) {
        const businessData = businessDoc.docs[0].data();
        setCurrency(businessData.currency || 'GBP');
      }

      // Fetch all appointments
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('businessId', '==', user!.uid)
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const allAppointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Filter by date range
      const filteredAppointmentsData = allAppointments.filter((apt: any) => {
        const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
        return aptDate >= startDate && aptDate <= endDate;
      });
      setFilteredAppointments(filteredAppointmentsData);

      // Calculate financial metrics
      let totalRev = 0;
      let paidRev = 0;
      let partialRev = 0;
      let pendingRev = 0;
      let depositRev = 0;
      let refunded = 0;
      let outstanding = 0;

      filteredAppointmentsData.forEach((apt: any) => {
        const price = apt.price || 0;
        totalRev += price;

        if (apt.payment?.status === 'paid') {
          paidRev += apt.payment.amount || price;
        } else if (apt.payment?.status === 'partial') {
          partialRev += apt.payment.amount || 0;
          outstanding += apt.payment.remainingBalance || 0;
        } else if (apt.payment?.status === 'pending') {
          pendingRev += price;
        }

        if (apt.payment?.paymentType === 'deposit') {
          depositRev += apt.payment.amount || 0;
        }

        if (apt.payment?.refunded) {
          refunded += apt.payment.refundAmount || 0;
        }
      });

      setTotalRevenue(totalRev);
      setPaidRevenue(paidRev);
      setPartialRevenue(partialRev);
      setPendingRevenue(pendingRev);
      setDepositRevenue(depositRev);
      setRefundedAmount(refunded);
      setOutstandingBalance(outstanding);

      // Calculate appointment metrics
      setTotalAppointments(filteredAppointmentsData.length);
      setCompletedAppointments(filteredAppointmentsData.filter((a: any) => a.status === 'completed').length);
      setUpcomingAppointments(filteredAppointmentsData.filter((a: any) => {
        const aptDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        return a.status === 'confirmed' && aptDate > new Date();
      }).length);
      setCancelledAppointments(filteredAppointmentsData.filter((a: any) => a.status === 'cancelled').length);
      setNoShowAppointments(filteredAppointmentsData.filter((a: any) => a.status === 'no-show').length);

      // Fetch clients
      const clientsQuery = query(collection(db, 'clients'), where('businessId', '==', user!.uid));
      const clientsSnapshot = await getDocs(clientsQuery);
      const allClients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      setTotalClients(allClients.length);
      
      const newClientsList = allClients.filter((c: any) => {
        const createdAt = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt || 0);
        return createdAt >= startDate;
      });
      setNewClients(newClientsList.length);
      
      const returning = allClients.filter((c: any) => (c.totalVisits || 0) > 1).length;
      setReturningClients(returning);
      
      const online = filteredAppointmentsData.filter((a: any) => a.source === 'online_booking').length;
      setOnlineBookings(online);

      // Top clients by spend
      const clientSpendMap = new Map();
      filteredAppointmentsData.forEach((apt: any) => {
        if (apt.payment?.status === 'paid' || apt.payment?.status === 'partial') {
          const clientId = apt.clientId;
          const current = clientSpendMap.get(clientId) || 0;
          clientSpendMap.set(clientId, current + (apt.payment.amount || 0));
        }
      });

      const topClientsData = Array.from(clientSpendMap.entries())
        .map(([clientId, amount]) => {
          const client = allClients.find((c: any) => c.id === clientId);
          return { client, amount };
        })
        .filter(item => item.client)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
      setTopClients(topClientsData);

      // Average client spend
      const totalSpend = Array.from(clientSpendMap.values()).reduce((sum: number, val: any) => sum + val, 0);
      setAvgClientSpend(clientSpendMap.size > 0 ? totalSpend / clientSpendMap.size : 0);

      // Service analysis
      const serviceMap = new Map();
      const serviceRevenueMap = new Map();
      
      filteredAppointmentsData.forEach((apt: any) => {
        const service = apt.serviceName || 'Unknown';
        serviceMap.set(service, (serviceMap.get(service) || 0) + 1);
        
        if (apt.payment?.status === 'paid' || apt.payment?.status === 'partial') {
          serviceRevenueMap.set(service, (serviceRevenueMap.get(service) || 0) + (apt.payment.amount || 0));
        }
      });

      const topServicesData = Array.from(serviceMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopServices(topServicesData);

      const serviceRevenueData = Array.from(serviceRevenueMap.entries())
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      setServiceRevenue(serviceRevenueData);

      // Product sales analysis
      const productMap = new Map();
      const productRevenueMap = new Map();
      let totalProductRev = 0;
      let totalUnits = 0;
      
      filteredAppointmentsData.forEach((apt: any) => {
        if (apt.products && Array.isArray(apt.products) && apt.products.length > 0) {
          apt.products.forEach((product: any) => {
            const productName = product.name || product.productName || 'Unknown Product';
            const quantity = product.quantity || 1;
            const productTotal = product.total || (product.price || 0) * quantity;
            
            // Count units sold
            totalUnits += quantity;
            
            // Track by product name
            productMap.set(productName, (productMap.get(productName) || 0) + quantity);
            
            // Track revenue (only if payment is paid or partial)
            if (apt.payment?.status === 'paid' || apt.payment?.status === 'partial') {
              productRevenueMap.set(productName, (productRevenueMap.get(productName) || 0) + productTotal);
              totalProductRev += productTotal;
            }
          });
        }
      });
      
      setTotalProductRevenue(totalProductRev);
      setTotalProductUnits(totalUnits);
      
      const topProductsData = Array.from(productMap.entries())
        .map(([name, units]) => ({ 
          name, 
          units, 
          revenue: productRevenueMap.get(name) || 0 
        }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 10);
      setTopProducts(topProductsData);
      
      const productSalesData = Array.from(productRevenueMap.entries())
        .map(([name, revenue]) => ({ name, revenue, units: productMap.get(name) || 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      setProductSales(productSalesData);

      // Staff performance
      const staffMap = new Map();
      filteredAppointmentsData.forEach((apt: any) => {
        const staff = apt.staffName || 'Unknown';
        const current = staffMap.get(staff) || { appointments: 0, revenue: 0, completed: 0 };
        current.appointments += 1;
        if (apt.status === 'completed') current.completed += 1;
        if (apt.payment?.status === 'paid' || apt.payment?.status === 'partial') {
          current.revenue += apt.payment.amount || 0;
        }
        staffMap.set(staff, current);
      });

      const staffPerfData = Array.from(staffMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue);
      setStaffPerformance(staffPerfData);

      // Revenue by day
      const dayRevenueMap = new Map();
      filteredAppointmentsData.forEach((apt: any) => {
        if (apt.payment?.status === 'paid' || apt.payment?.status === 'partial') {
          const date = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
          const dateStr = date.toLocaleDateString();
          dayRevenueMap.set(dateStr, (dayRevenueMap.get(dateStr) || 0) + (apt.payment.amount || 0));
        }
      });

      const revByDay = Array.from(dayRevenueMap.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setRevenueByDay(revByDay);

      // Appointments by day
      const dayAppointmentMap = new Map();
      filteredAppointmentsData.forEach((apt: any) => {
        const date = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
        const dateStr = date.toLocaleDateString();
        dayAppointmentMap.set(dateStr, (dayAppointmentMap.get(dateStr) || 0) + 1);
      });

      const apptByDay = Array.from(dayAppointmentMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setAppointmentsByDay(apptByDay);

      // Peak hours
      const hourMap = new Map();
      filteredAppointmentsData.forEach((apt: any) => {
        const time = apt.time || '';
        const hour = parseInt(time.split(':')[0] || '0');
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      });

      const peakHoursData = Array.from(hourMap.entries())
        .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setPeakHours(peakHoursData);

      // Peak days of week
      const dayOfWeekMap = new Map(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => [d, 0]));
      filteredAppointmentsData.forEach((apt: any) => {
        const date = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        dayOfWeekMap.set(dayName, (dayOfWeekMap.get(dayName) || 0) + 1);
      });

      const peakDaysData = Array.from(dayOfWeekMap.entries())
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => b.count - a.count);
      setPeakDays(peakDaysData);

      // Payment methods
      const paymentMethodMap = new Map();
      filteredAppointmentsData.forEach((apt: any) => {
        if (apt.payment?.method) {
          const method = apt.payment.method;
          const current = paymentMethodMap.get(method) || { count: 0, amount: 0 };
          current.count += 1;
          if (apt.payment.status === 'paid' || apt.payment.status === 'partial') {
            current.amount += apt.payment.amount || 0;
          }
          paymentMethodMap.set(method, current);
        }
      });

      const paymentMethodsData = Array.from(paymentMethodMap.entries())
        .map(([method, data]) => ({ method, ...data }))
        .sort((a, b) => b.amount - a.amount);
      setPaymentMethods(paymentMethodsData);

      // Loyalty stats
      const loyaltyQuery = query(collection(db, 'loyalty'), where('businessId', '==', user!.uid));
      const loyaltySnapshot = await getDocs(loyaltyQuery);
      let totalPoints = 0;
      let redeemedPoints = 0;
      let pointsEarnedThisPeriod = 0;
      let pointsRedeemedThisPeriod = 0;
      const topEarners: any[] = [];
      const recentEarnings: any[] = [];
      const recentRedemptions: any[] = [];

      loyaltySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const clientId = data.clientId;
        const client = allClients.find((c: any) => c.id === clientId);
        
        totalPoints += data.points || 0;
        redeemedPoints += data.pointsRedeemed || 0;
        
        // Calculate points earned in this period
        if (data.earnedAt) {
          const earnedDate = data.earnedAt?.toDate ? data.earnedAt.toDate() : new Date(data.earnedAt);
          if (earnedDate >= startDate && earnedDate <= endDate) {
            pointsEarnedThisPeriod += data.points || 0;
            recentEarnings.push({
              clientName: client?.name || 'Unknown Client',
              points: data.points || 0,
              date: earnedDate,
              reason: data.reason || 'Appointment completed'
            });
          }
        }
        
        // Calculate points redeemed in this period
        if (data.redeemedAt) {
          const redeemedDate = data.redeemedAt?.toDate ? data.redeemedAt.toDate() : new Date(data.redeemedAt);
          if (redeemedDate >= startDate && redeemedDate <= endDate) {
            pointsRedeemedThisPeriod += data.pointsRedeemed || 0;
            recentRedemptions.push({
              clientName: client?.name || 'Unknown Client',
              points: data.pointsRedeemed || 0,
              date: redeemedDate,
              reward: data.rewardName || 'Points discount'
            });
          }
        }
        
        // Track top earners
        if (client && (data.points || 0) > 0) {
          topEarners.push({
            clientName: client.name,
            clientEmail: client.email,
            totalPoints: data.points || 0,
            pointsRedeemed: data.pointsRedeemed || 0,
            netPoints: (data.points || 0) - (data.pointsRedeemed || 0)
          });
        }
      });

      // Sort and limit top earners
      const sortedTopEarners = topEarners
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 10);

      // Sort recent activities by date
      const sortedRecentEarnings = recentEarnings
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10);
      
      const sortedRecentRedemptions = recentRedemptions
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10);

      const averagePointsPerClient = loyaltySnapshot.size > 0 ? totalPoints / loyaltySnapshot.size : 0;

      setLoyaltyStats({
        totalPoints,
        redeemedPoints,
        activeMembers: loyaltySnapshot.size,
        pointsEarnedThisPeriod,
        pointsRedeemedThisPeriod,
        averagePointsPerClient,
        topEarners: sortedTopEarners,
        recentEarnings: sortedRecentEarnings,
        recentRedemptions: sortedRecentRedemptions,
      });

      // Gift voucher stats
      const vouchersQuery = query(collection(db, 'giftVouchers'), where('businessId', '==', user!.uid));
      const vouchersSnapshot = await getDocs(vouchersQuery);
      let totalVouchers = 0;
      let totalValue = 0;
      let redeemedVouchers = 0;
      let redeemedValue = 0;
      let pendingVouchers = 0;
      let pendingValue = 0;
      let expiredVouchers = 0;
      let expiredValue = 0;

      vouchersSnapshot.docs.forEach(doc => {
        const voucher = doc.data();
        totalVouchers++;
        totalValue += voucher.amount || 0;

        if (voucher.status === 'redeemed') {
          redeemedVouchers++;
          redeemedValue += voucher.amount || 0;
        } else if (voucher.status === 'pending') {
          pendingVouchers++;
          pendingValue += voucher.amount || 0;
        } else if (voucher.status === 'expired') {
          expiredVouchers++;
          expiredValue += voucher.amount || 0;
        }
      });

      setGiftVoucherStats({
        totalVouchers,
        totalValue,
        redeemedVouchers,
        redeemedValue,
        pendingVouchers,
        pendingValue,
        expiredVouchers,
        expiredValue,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setLoading(false);
    }
  };

  const exportReport = () => {
    // Create CSV data
    const csvData = [
      ['Zentra Business Report'],
      ['Date Range:', dateRange],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['FINANCIAL SUMMARY'],
      ['Total Revenue', formatPrice(totalRevenue, currency)],
      ['Paid Revenue', formatPrice(paidRevenue, currency)],
      ['Partial Payments', formatPrice(partialRevenue, currency)],
      ['Pending Revenue', formatPrice(pendingRevenue, currency)],
      ['Deposit Revenue', formatPrice(depositRevenue, currency)],
      ['Refunded Amount', formatPrice(refundedAmount, currency)],
      ['Outstanding Balance', formatPrice(outstandingBalance, currency)],
      [''],
      ['APPOINTMENT SUMMARY'],
      ['Total Appointments', totalAppointments],
      ['Completed', completedAppointments],
      ['Upcoming', upcomingAppointments],
      ['Cancelled', cancelledAppointments],
      ['No-Shows', noShowAppointments],
      [''],
      ['CLIENT SUMMARY'],
      ['Total Clients', totalClients],
      ['New Clients', newClients],
      ['Returning Clients', returningClients],
      ['Online Bookings', onlineBookings],
      ['Average Client Spend', formatPrice(avgClientSpend, currency)],
      [''],
      ['LOYALTY PROGRAM SUMMARY'],
      ['Active Members', loyaltyStats.activeMembers],
      ['Total Points Earned', loyaltyStats.totalPoints],
      ['Total Points Redeemed', loyaltyStats.redeemedPoints],
      ['Points Earned This Period', loyaltyStats.pointsEarnedThisPeriod],
      ['Points Redeemed This Period', loyaltyStats.pointsRedeemedThisPeriod],
      ['Average Points Per Client', loyaltyStats.averagePointsPerClient.toFixed(1)],
      [''],
      ['PRODUCT SALES SUMMARY'],
      ['Total Product Revenue', formatPrice(totalProductRevenue, currency)],
      ['Total Units Sold', totalProductUnits],
      ['Average Price per Unit', totalProductUnits > 0 ? formatPrice(totalProductRevenue / totalProductUnits, currency) : formatPrice(0, currency)],
      [''],
      ['GIFT VOUCHER SUMMARY'],
      ['Total Vouchers', giftVoucherStats.totalVouchers],
      ['Total Value', formatPrice(giftVoucherStats.totalValue, currency)],
      ['Redeemed Vouchers', giftVoucherStats.redeemedVouchers],
      ['Redeemed Value', formatPrice(giftVoucherStats.redeemedValue, currency)],
      ['Pending Vouchers', giftVoucherStats.pendingVouchers],
      ['Pending Value', formatPrice(giftVoucherStats.pendingValue, currency)],
      ['Expired Vouchers', giftVoucherStats.expiredVouchers],
      ['Expired Value', formatPrice(giftVoucherStats.expiredValue, currency)],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zentra-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportAllCustomers = async () => {
    if (!user) return;
    
    try {
      // Fetch all clients
      const clientsQuery = query(
        collection(db, 'clients'),
        where('businessId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      const clients = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Create CSV headers
      const headers = [
        'Client ID',
        'Name',
        'Email',
        'Phone',
        'Birthday',
        'Membership Level',
        'Loyalty Points',
        'Total Visits',
        'Total Spent',
        'Last Visit',
        'Notes',
        'Created At'
      ];

      // Create CSV data
      const csvData = [headers];
      clients.forEach(client => {
        csvData.push([
          client.id,
          client.name || '',
          client.email || '',
          client.phone || '',
          client.birthday || '',
          client.membershipLevel || 'bronze',
          client.loyaltyPoints || 0,
          client.totalVisits || 0,
          formatPrice(client.totalSpent || 0, currency),
          client.lastVisit ? (client.lastVisit.toDate ? client.lastVisit.toDate().toLocaleDateString() : new Date(client.lastVisit).toLocaleDateString()) : '',
          client.notes || '',
          client.createdAt ? (client.createdAt.toDate ? client.createdAt.toDate().toLocaleDateString() : new Date(client.createdAt).toLocaleDateString()) : ''
        ]);
      });

      const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zentra-customers-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exporting customers:', error);
      showToast('Failed to export customers. Please try again.', 'error');
    }
  };

  const exportAllPayments = async () => {
    if (!user) return;
    
    try {
      // Fetch all appointments with payment data
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('businessId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointments = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Create CSV headers
      const headers = [
        'Appointment ID',
        'Client Name',
        'Client Email',
        'Service Name',
        'Service Price',
        'Products',
        'Product Quantity',
        'Product Price',
        'Total Product Price',
        'Total Price (Service + Products)',
        'Staff Name',
        'Date',
        'Time',
        'Duration (min)',
        'Payment Status',
        'Payment Method',
        'Amount Paid',
        'Deposit Paid',
        'Deposit Required',
        'Deposit Percentage',
        'Outstanding Balance',
        'Appointment Status',
        'Location',
        'Notes',
        'Created At'
      ];

      // Create CSV data
      const csvData = [headers];
      appointments.forEach(appointment => {
        const appointmentDate = appointment.date?.toDate ? appointment.date.toDate() : new Date(appointment.date);
        const createdDate = appointment.createdAt?.toDate ? appointment.createdAt.toDate() : new Date(appointment.createdAt);
        
        // Calculate service and product prices
        const servicePrice = appointment.servicePrice !== undefined 
          ? appointment.servicePrice 
          : (appointment.price || 0) - (appointment.productsPrice || 0);
        const productsPrice = appointment.productsPrice !== undefined
          ? appointment.productsPrice
          : (appointment.products || []).reduce((total: number, p: any) => 
              total + (p.total || (p.price || 0) * (p.quantity || 1)), 
            0);
        const totalPrice = appointment.price || (servicePrice + productsPrice);
        
        // Format products for CSV
        const products = appointment.products && Array.isArray(appointment.products) && appointment.products.length > 0
          ? appointment.products.map((p: any) => p.name || 'Unknown Product').join('; ')
          : '';
        const productQuantities = appointment.products && Array.isArray(appointment.products) && appointment.products.length > 0
          ? appointment.products.map((p: any) => p.quantity || 1).join('; ')
          : '';
        const productPrices = appointment.products && Array.isArray(appointment.products) && appointment.products.length > 0
          ? appointment.products.map((p: any) => formatPrice(p.price || 0, currency)).join('; ')
          : '';
        
        csvData.push([
          appointment.id,
          appointment.clientName || '',
          appointment.clientEmail || '',
          appointment.serviceName || '',
          formatPrice(servicePrice, currency),
          products || '',
          productQuantities || '',
          productPrices || '',
          formatPrice(productsPrice, currency),
          formatPrice(totalPrice, currency),
          appointment.staffName || '',
          appointmentDate.toLocaleDateString(),
          appointment.time || '',
          appointment.duration || 0,
          appointment.payment?.status || '',
          appointment.payment?.method || '',
          formatPrice(appointment.payment?.amount || 0, currency),
          appointment.payment?.depositPaid ? 'Yes' : 'No',
          appointment.payment?.depositRequired ? 'Yes' : 'No',
          appointment.payment?.depositPercentage || 0,
          formatPrice(totalPrice - (appointment.payment?.amount || 0), currency),
          appointment.status || '',
          appointment.locationName || '',
          appointment.notes || '',
          createdDate.toLocaleDateString()
        ]);
      });

      const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zentra-payments-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exporting payments:', error);
      showToast('Failed to export payments. Please try again.', 'error');
    }
  };

  const exportAllGiftVouchers = async () => {
    if (!user) return;
    
    try {
      // Fetch all gift vouchers
      const vouchersQuery = query(
        collection(db, 'giftVouchers'),
        where('businessId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const vouchersSnapshot = await getDocs(vouchersQuery);
      const vouchers = vouchersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Create CSV headers
      const headers = [
        'Voucher ID',
        'Code',
        'Amount',
        'Status',
        'Purchaser Name',
        'Purchaser Email',
        'Recipient Name',
        'Recipient Email',
        'Message',
        'Expiry Date',
        'Redeemed Date',
        'Redeemed By',
        'Created At'
      ];

      // Create CSV data
      const csvData = [headers];
      vouchers.forEach(voucher => {
        const createdDate = voucher.createdAt?.toDate ? voucher.createdAt.toDate() : new Date(voucher.createdAt);
        const expiryDate = voucher.expiryDate?.toDate ? voucher.expiryDate.toDate() : new Date(voucher.expiryDate);
        const redeemedDate = voucher.redeemedAt?.toDate ? voucher.redeemedAt.toDate() : new Date(voucher.redeemedAt);
        
        csvData.push([
          voucher.id,
          voucher.code || '',
          formatPrice(voucher.amount || 0, currency),
          voucher.status || '',
          voucher.purchaserName || '',
          voucher.purchaserEmail || '',
          voucher.recipientName || '',
          voucher.recipientEmail || '',
          voucher.message || '',
          expiryDate.toLocaleDateString(),
          voucher.redeemedAt ? redeemedDate.toLocaleDateString() : '',
          voucher.redeemedBy || '',
          createdDate.toLocaleDateString()
        ]);
      });

      const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zentra-gift-vouchers-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exporting gift vouchers:', error);
      showToast('Failed to export gift vouchers. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-cream">
        <DashboardSidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading report data...</p>
          </div>
        </div>
      </div>
    );
  }

  const completionRate = totalAppointments > 0 ? ((completedAppointments / totalAppointments) * 100).toFixed(1) : 0;
  const cancellationRate = totalAppointments > 0 ? ((cancelledAppointments / totalAppointments) * 100).toFixed(1) : 0;
  const noShowRate = totalAppointments > 0 ? ((noShowAppointments / totalAppointments) * 100).toFixed(1) : 0;
  const collectionRate = totalRevenue > 0 ? ((paidRevenue / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-soft-cream">
      <DashboardSidebar />
      <div className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <SubscriptionGuard feature="advancedReporting">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900 mb-2">Business Reports & Analytics</h1>
              <p className="text-sm lg:text-base text-gray-600">Comprehensive insights into your business performance</p>
            </div>
            <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2">
              <button
                onClick={exportReport}
                className="px-3 lg:px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 min-h-[44px] text-sm lg:text-base"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export Summary</span>
              </button>
              
              <button
                onClick={exportAllCustomers}
                className="px-3 lg:px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 min-h-[44px] text-sm lg:text-base"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span>Export Customers</span>
              </button>
              
              <button
                onClick={exportAllPayments}
                className="px-3 lg:px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 min-h-[44px] text-sm lg:text-base"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Export Payments</span>
              </button>
              
              <button
                onClick={exportAllGiftVouchers}
                className="px-3 lg:px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 min-h-[44px] text-sm lg:text-base"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                <span>Export Vouchers</span>
              </button>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-wrap gap-2 items-end">
            {(['7days', '30days', '90days', 'year', 'all', 'custom'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-colors min-h-[44px] text-sm lg:text-base ${
                  dateRange === range
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {range === '7days' && 'Last 7 Days'}
                {range === '30days' && 'Last 30 Days'}
                {range === '90days' && 'Last 90 Days'}
                {range === 'year' && 'Last Year'}
                {range === 'all' && 'All Time'}
                {range === 'custom' && 'Custom Range'}
              </button>
            ))}

            {/* Custom Date Inputs */}
            {dateRange === 'custom' && (
              <>
                <div className="flex flex-col w-full sm:w-auto">
                  <label className="text-xs text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                  />
                </div>
                <div className="flex flex-col w-full sm:w-auto">
                  <label className="text-xs text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px]"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Financial Overview */}
        <div className="mb-6">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">Financial Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs lg:text-sm text-gray-600">Total Revenue</p>
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{formatPrice(totalRevenue, currency)}</p>
              <p className="text-xs text-gray-500 mt-1">{totalAppointments} appointments</p>
            </div>

            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs lg:text-sm text-gray-600">Collected</p>
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xl lg:text-2xl font-bold text-green-600">{formatPrice(paidRevenue, currency)}</p>
              <p className="text-xs text-gray-500 mt-1">{collectionRate}% collection rate</p>
            </div>

            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs lg:text-sm text-gray-600">Outstanding</p>
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 lg:w-6 lg:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xl lg:text-2xl font-bold text-yellow-600">{formatPrice(outstandingBalance, currency)}</p>
              <p className="text-xs text-gray-500 mt-1">Partial payments</p>
            </div>

            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs lg:text-sm text-gray-600">Refunded</p>
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 lg:w-6 lg:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-xl lg:text-2xl font-bold text-red-600">{formatPrice(refundedAmount, currency)}</p>
              <p className="text-xs text-gray-500 mt-1">Total refunds</p>
            </div>
          </div>
        </div>

        {/* Appointment Metrics */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Appointment Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-3xl font-bold text-gray-900">{totalAppointments}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-green-600">{completedAppointments}</p>
              <p className="text-xs text-gray-500 mt-1">{completionRate}%</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Upcoming</p>
              <p className="text-3xl font-bold text-blue-600">{upcomingAppointments}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Cancelled</p>
              <p className="text-3xl font-bold text-orange-600">{cancelledAppointments}</p>
              <p className="text-xs text-gray-500 mt-1">{cancellationRate}%</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">No-Shows</p>
              <p className="text-3xl font-bold text-red-600">{noShowAppointments}</p>
              <p className="text-xs text-gray-500 mt-1">{noShowRate}%</p>
            </div>
          </div>
        </div>

        {/* Client Insights */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Client Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900">{totalClients}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">New Clients</p>
              <p className="text-3xl font-bold text-blue-600">{newClients}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Returning Clients</p>
              <p className="text-3xl font-bold text-green-600">{returningClients}</p>
              <p className="text-xs text-gray-500 mt-1">{totalClients > 0 ? ((returningClients / totalClients) * 100).toFixed(1) : 0}% retention</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Avg Spend</p>
              <p className="text-3xl font-bold text-purple-600">{formatPrice(avgClientSpend, currency)}</p>
            </div>
          </div>

          {/* Top Clients */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Top 10 Clients by Revenue</h3>
            <div className="space-y-3">
              {topClients.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.client.name}</p>
                      <p className="text-xs text-gray-500">{item.client.email}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">{formatPrice(item.amount, currency)}</p>
                </div>
              ))}
              {topClients.length === 0 && (
                <p className="text-gray-500 text-center py-4">No client data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Service Performance */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Service Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Most Popular Services */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Most Popular Services</h3>
              <div className="space-y-3">
                {topServices.map((service, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <p className="font-medium text-gray-900">{service.name}</p>
                    </div>
                    <p className="text-gray-600">{service.count} bookings</p>
                  </div>
                ))}
                {topServices.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No service data available</p>
                )}
              </div>
            </div>

            {/* Top Revenue Services */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Top Revenue Services</h3>
              <div className="space-y-3">
                {serviceRevenue.map((service, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <p className="font-medium text-gray-900">{service.name}</p>
                    </div>
                    <p className="font-semibold text-gray-900">{formatPrice(service.revenue, currency)}</p>
                  </div>
                ))}
                {serviceRevenue.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No revenue data available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product Sales */}
        {totalProductRevenue > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Product Sales</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Total Product Revenue</div>
                <div className="text-2xl font-bold text-gray-900">{formatPrice(totalProductRevenue, currency)}</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Total Units Sold</div>
                <div className="text-2xl font-bold text-gray-900">{totalProductUnits}</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Average Price per Unit</div>
                <div className="text-2xl font-bold text-gray-900">
                  {totalProductUnits > 0 ? formatPrice(totalProductRevenue / totalProductUnits, currency) : formatPrice(0, currency)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Selling Products */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Top Selling Products (Units)</h3>
                <div className="space-y-3">
                  {topProducts.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{product.units} units</p>
                        <p className="text-sm text-gray-600">{formatPrice(product.revenue, currency)}</p>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No product sales data available</p>
                  )}
                </div>
              </div>

              {/* Top Revenue Products */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Top Revenue Products</h3>
                <div className="space-y-3">
                  {productSales.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatPrice(product.revenue, currency)}</p>
                        <p className="text-sm text-gray-600">{product.units} units</p>
                      </div>
                    </div>
                  ))}
                  {productSales.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No product revenue data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staff Performance */}
        {staffPerformance.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Staff Performance</h2>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="space-y-4">
                {staffPerformance.map((staff, idx) => (
                  <div key={idx} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{staff.name}</p>
                      <p className="font-bold text-gray-900">{formatPrice(staff.revenue, currency)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Appointments</p>
                        <p className="font-medium text-gray-900">{staff.appointments}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Completed</p>
                        <p className="font-medium text-gray-900">{staff.completed}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Completion Rate</p>
                        <p className="font-medium text-gray-900">
                          {staff.appointments > 0 ? ((staff.completed / staff.appointments) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Peak Times */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Busiest Times</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Peak Hours */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Peak Hours</h3>
              <div className="space-y-3">
                {peakHours.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{item.hour}</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(item.count / peakHours[0]?.count) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-gray-600 w-8 text-right">{item.count}</p>
                    </div>
                  </div>
                ))}
                {peakHours.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>

            {/* Peak Days */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Busiest Days</h3>
              <div className="space-y-3">
                {peakDays.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{item.day}</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${peakDays[0]?.count > 0 ? (item.count / peakDays[0].count) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <p className="text-gray-600 w-8 text-right">{item.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        {paymentMethods.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Methods</h2>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {paymentMethods.map((pm, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1 capitalize">{pm.method}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(pm.amount, currency)}</p>
                    <p className="text-xs text-gray-500 mt-1">{pm.count} transactions</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loyalty Program */}
        {loyaltyStats.activeMembers > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Loyalty Program Analytics</h2>
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Active Members</p>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{loyaltyStats.activeMembers}</p>
                <p className="text-xs text-gray-500 mt-1">Total members</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Points Earned</p>
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-purple-600">{loyaltyStats.totalPoints.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Points Redeemed</p>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-600">{loyaltyStats.redeemedPoints.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Avg Points/Client</p>
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-amber-600">{loyaltyStats.averagePointsPerClient.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">Per member</p>
              </div>
            </div>

            {/* Period-specific stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Points Earned This Period</h3>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl font-bold text-blue-600 mb-2">{loyaltyStats.pointsEarnedThisPeriod.toLocaleString()}</p>
                <p className="text-sm text-gray-500">
                  {loyaltyStats.totalPoints > 0 ? 
                    `${((loyaltyStats.pointsEarnedThisPeriod / loyaltyStats.totalPoints) * 100).toFixed(1)}% of all time` : 
                    'No historical data'
                  }
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Points Redeemed This Period</h3>
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl font-bold text-red-600 mb-2">{loyaltyStats.pointsRedeemedThisPeriod.toLocaleString()}</p>
                <p className="text-sm text-gray-500">
                  {loyaltyStats.redeemedPoints > 0 ? 
                    `${((loyaltyStats.pointsRedeemedThisPeriod / loyaltyStats.redeemedPoints) * 100).toFixed(1)}% of all time` : 
                    'No historical data'
                  }
                </p>
              </div>
            </div>

            {/* Top Earners */}
            {loyaltyStats.topEarners.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Top Points Earners</h3>
                  <div className="space-y-3">
                    {loyaltyStats.topEarners.slice(0, 5).map((earner, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{earner.clientName}</p>
                            <p className="text-xs text-gray-500">{earner.clientEmail}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{earner.totalPoints.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{earner.netPoints.toLocaleString()} net</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Recent Points Activity</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {/* Recent Earnings */}
                    {loyaltyStats.recentEarnings.slice(0, 3).map((earning, idx) => (
                      <div key={`earn-${idx}`} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">+{earning.points} points</p>
                            <p className="text-xs text-gray-500">{earning.clientName}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{earning.date.toLocaleDateString()}</p>
                      </div>
                    ))}
                    
                    {/* Recent Redemptions */}
                    {loyaltyStats.recentRedemptions.slice(0, 3).map((redemption, idx) => (
                      <div key={`redeem-${idx}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">-{redemption.points} points</p>
                            <p className="text-xs text-gray-500">{redemption.clientName}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{redemption.date.toLocaleDateString()}</p>
                      </div>
                    ))}
                    
                    {loyaltyStats.recentEarnings.length === 0 && loyaltyStats.recentRedemptions.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gift Vouchers */}
        {giftVoucherStats.totalVouchers > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Gift Vouchers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total Vouchers</p>
                <p className="text-3xl font-bold text-gray-900">{giftVoucherStats.totalVouchers}</p>
                <p className="text-xs text-gray-500 mt-1">{formatPrice(giftVoucherStats.totalValue, currency)} total value</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Redeemed</p>
                <p className="text-3xl font-bold text-green-600">{giftVoucherStats.redeemedVouchers}</p>
                <p className="text-xs text-gray-500 mt-1">{formatPrice(giftVoucherStats.redeemedValue, currency)} redeemed</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{giftVoucherStats.pendingVouchers}</p>
                <p className="text-xs text-gray-500 mt-1">{formatPrice(giftVoucherStats.pendingValue, currency)} pending</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Expired</p>
                <p className="text-3xl font-bold text-red-600">{giftVoucherStats.expiredVouchers}</p>
                <p className="text-xs text-gray-500 mt-1">{formatPrice(giftVoucherStats.expiredValue, currency)} expired</p>
              </div>
            </div>
          </div>
        )}

        {/* Online Booking Stats */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Channels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Online Bookings</p>
              <p className="text-3xl font-bold text-blue-600">{onlineBookings}</p>
              <p className="text-xs text-gray-500 mt-1">
                {totalAppointments > 0 ? ((onlineBookings / totalAppointments) * 100).toFixed(1) : 0}% of total
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">In-Person Bookings</p>
              <p className="text-3xl font-bold text-gray-900">{totalAppointments - onlineBookings}</p>
              <p className="text-xs text-gray-500 mt-1">
                {totalAppointments > 0 ? (((totalAppointments - onlineBookings) / totalAppointments) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>
        </div>

        {/* Gift Vouchers Stats */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Gift Vouchers</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Sold</p>
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(
                  filteredAppointments
                    .filter((apt: any) => apt.payment?.voucherUsed)
                    .reduce((sum: number, apt: any) => sum + (apt.payment?.voucherUsed?.amount || 0), 0),
                  currency
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {filteredAppointments.filter((apt: any) => apt.payment?.voucherUsed).length} vouchers used
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Active Vouchers</p>
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {/* Note: This would need vouchers data - placeholder for now */}
                -
              </p>
              <p className="text-xs text-gray-500 mt-1">Currently unredeemed</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Redeemed</p>
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {filteredAppointments.filter((apt: any) => apt.payment?.voucherUsed).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Vouchers applied to bookings</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Avg Value</p>
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {formatPrice(
                  filteredAppointments.filter((apt: any) => apt.payment?.voucherUsed).length > 0
                    ? filteredAppointments
                        .filter((apt: any) => apt.payment?.voucherUsed)
                        .reduce((sum: number, apt: any) => sum + (apt.payment?.voucherUsed?.amount || 0), 0) /
                      filteredAppointments.filter((apt: any) => apt.payment?.voucherUsed).length
                    : 0,
                  currency
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">Per voucher redemption</p>
            </div>
          </div>
        </div>
          </SubscriptionGuard>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

