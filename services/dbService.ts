
import { Player } from '../types';

export interface Transaction {
  type: 'bet' | 'win' | 'deposit' | 'withdraw' | 'admin_adjust' | 'house_withdraw' | 'house_deposit' | 'promo_claim';
  amount: number;
  multiplier?: number;
  timestamp: number;
  balanceAfter: number;
  roomName?: string;
  note?: string;
  isDemo?: boolean;
}

export interface SupportTicket {
    id: string;
    userPhone: string;
    subject: string;
    message: string;
    status: 'open' | 'resolved' | 'closed';
    createdAt: number;
    adminResponse?: string;
}

export interface UserAccount {
  phone: string; // Acts as ID/Username
  password?: string; // Optional for demo/admin
  balance: number;
  demoBalance: number; // New separate wallet
  role: 'user' | 'admin';
  joinedAt: number;
  totalDeposited: number;
  totalWithdrawn: number;
  isBanned: boolean;
  isFrozen: boolean;
  history: Transaction[];
  ip?: string;
}

export interface HouseAccount {
    balance: number;
    totalProfit: number;
    totalPayouts: number;
    profitHistory: { timestamp: number; balance: number }[];
}

export interface GameConfig {
    maintenanceMode: boolean;
    rtp: number;
    minBet: number;
    maxBet: number;
    maxProfitPerRound: number;
    enableChat: boolean;
    enableDemo: boolean;
    security: {
        require2FA: boolean;
        ipWhitelist: boolean;
        antiFraudAI: boolean;
    };
}

export interface RoundLog {
    crashPoint: number;
    hash: string;
    timestamp: number;
}

export interface SystemLog {
    id: string;
    timestamp: number;
    admin: string;
    action: string;
    details: string;
    severity: 'info' | 'warning' | 'critical';
}

export interface Voucher {
    code: string;
    amount: number;
    maxClaims: number;
    claimedBy: string[];
    isActive: boolean;
}

const DB_KEY = 'dundabets_db_v4'; 
const HOUSE_KEY = 'dundabets_house_v1';
const TICKETS_KEY = 'dundabets_tickets_v1';
const CONFIG_KEY = 'dundabets_config_v1';
const ROUNDS_KEY = 'dundabets_rounds_v1';
const LOGS_KEY = 'dundabets_logs_v1';
const VOUCHERS_KEY = 'dundabets_vouchers_v1';

const ROOT_USER = 'root';

const DEFAULT_CONFIG: GameConfig = {
    maintenanceMode: false,
    rtp: 96,
    minBet: 10,
    maxBet: 5000,
    maxProfitPerRound: 1000000,
    enableChat: true,
    enableDemo: true,
    security: {
        require2FA: false,
        ipWhitelist: false,
        antiFraudAI: true
    }
};

class DBService {
  private users: Record<string, UserAccount> = {};
  private house: HouseAccount = {
      balance: 500000, // Initial Capital
      totalProfit: 0,
      totalPayouts: 0,
      profitHistory: []
  };
  private tickets: SupportTicket[] = [];
  private config: GameConfig = DEFAULT_CONFIG;
  private roundHistory: RoundLog[] = [];
  private systemLogs: SystemLog[] = [];
  private vouchers: Voucher[] = [];

  constructor() {
    this.load();
    this.ensureRoot();
    this.initHouseHistory();
  }

  private load() {
    try {
      const userData = localStorage.getItem(DB_KEY);
      const houseData = localStorage.getItem(HOUSE_KEY);
      const ticketData = localStorage.getItem(TICKETS_KEY);
      const configData = localStorage.getItem(CONFIG_KEY);
      const roundsData = localStorage.getItem(ROUNDS_KEY);
      const logsData = localStorage.getItem(LOGS_KEY);
      const vouchersData = localStorage.getItem(VOUCHERS_KEY);

      if (userData) {
        this.users = JSON.parse(userData);
        // Migration to ensure new fields exist
        Object.values(this.users).forEach(u => {
            if (u.isBanned === undefined) u.isBanned = false;
            if (u.isFrozen === undefined) u.isFrozen = false;
            if (u.demoBalance === undefined) u.demoBalance = 50000;
        });
      }
      if (houseData) this.house = JSON.parse(houseData);
      if (ticketData) this.tickets = JSON.parse(ticketData);
      if (configData) {
          this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
      }
      if (roundsData) this.roundHistory = JSON.parse(roundsData);
      if (logsData) this.systemLogs = JSON.parse(logsData);
      if (vouchersData) this.vouchers = JSON.parse(vouchersData);
    } catch (e) {
      console.error("DB Load Failed", e);
    }
  }

  private save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.users));
      localStorage.setItem(HOUSE_KEY, JSON.stringify(this.house));
      localStorage.setItem(TICKETS_KEY, JSON.stringify(this.tickets));
      localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
      localStorage.setItem(ROUNDS_KEY, JSON.stringify(this.roundHistory));
      localStorage.setItem(LOGS_KEY, JSON.stringify(this.systemLogs));
      localStorage.setItem(VOUCHERS_KEY, JSON.stringify(this.vouchers));
    } catch (e) {
      console.error("DB Save Failed", e);
    }
  }

  private initHouseHistory() {
      if (this.house.profitHistory.length === 0) {
          this.house.profitHistory.push({ timestamp: Date.now(), balance: this.house.balance });
          this.save();
      }
  }

  private ensureRoot() {
    // If root doesn't exist or password isn't 'root', reset it
    if (!this.users[ROOT_USER] || this.users[ROOT_USER].password !== 'root') {
      this.users[ROOT_USER] = {
        phone: ROOT_USER,
        password: 'root',
        balance: 0,
        demoBalance: 0,
        role: 'admin',
        joinedAt: Date.now(),
        totalDeposited: 0,
        totalWithdrawn: 0,
        isBanned: false,
        isFrozen: false,
        history: [],
        ip: '127.0.0.1'
      };
      this.save();
    }
  }

  // --- LOGGING ---
  logSystemAction(admin: string, action: string, details: string, severity: 'info' | 'warning' | 'critical' = 'info') {
      const log: SystemLog = {
          id: Math.random().toString(36).substring(2),
          timestamp: Date.now(),
          admin,
          action,
          details,
          severity
      };
      this.systemLogs.unshift(log);
      if (this.systemLogs.length > 200) this.systemLogs = this.systemLogs.slice(0, 200);
      this.save();
  }

  getSystemLogs() {
      return this.systemLogs;
  }

  // --- PROMOS ---
  createVoucher(code: string, amount: number, maxClaims: number) {
      if (this.vouchers.find(v => v.code === code)) return { success: false, message: 'Code exists' };
      this.vouchers.push({
          code,
          amount,
          maxClaims,
          claimedBy: [],
          isActive: true
      });
      this.logSystemAction(ROOT_USER, 'CREATE_VOUCHER', `Created ${code} for ${amount} KSH`);
      this.save();
      return { success: true };
  }

  getVouchers() {
      return this.vouchers;
  }

  // --- HOUSE LOGIC ---

  getHouseStats() {
      return this.house;
  }

  processRoundResult(playerLosses: number, playerWins: number) {
      const netChange = playerLosses - playerWins;
      this.house.balance += netChange;
      
      if (netChange > 0) this.house.totalProfit += netChange;
      if (netChange < 0) this.house.totalPayouts += Math.abs(netChange);

      this.house.profitHistory.push({ timestamp: Date.now(), balance: this.house.balance });
      
      if (this.house.profitHistory.length > 50) {
          this.house.profitHistory.shift();
      }

      this.save();
  }

  withdrawHouseFunds(amount: number, method: 'MPESA' | 'BANK', destination: string) {
      if (this.house.balance < amount) return { success: false, message: 'Insufficient House Funds' };
      
      this.house.balance -= amount;
      this.logSystemAction(ROOT_USER, 'HOUSE_WITHDRAW', `Withdrew ${amount} to ${destination}`);
      this.save();
      return { success: true, balance: this.house.balance };
  }

  depositHouseFunds(amount: number) {
      this.house.balance += amount;
      this.logSystemAction(ROOT_USER, 'HOUSE_DEPOSIT', `Deposited ${amount}`);
      this.save();
      return this.house.balance;
  }

  // --- GAME CONFIG LOGIC ---

  getGameConfig(): GameConfig {
      return this.config;
  }

  updateGameConfig(newConfig: Partial<GameConfig>) {
      // Deep merge for security object if present
      if (newConfig.security && this.config.security) {
          this.config.security = { ...this.config.security, ...newConfig.security };
          delete newConfig.security; // Prevent overwrite
      }
      
      this.config = { ...this.config, ...newConfig };
      this.logSystemAction(ROOT_USER, 'CONFIG_UPDATE', `Updated: ${JSON.stringify(newConfig)}`, 'warning');
      this.save();
  }

  logRound(crashPoint: number, hash: string) {
      const log: RoundLog = {
          crashPoint,
          hash,
          timestamp: Date.now()
      };
      this.roundHistory.unshift(log); 
      if (this.roundHistory.length > 500) {
          this.roundHistory = this.roundHistory.slice(0, 500); 
      }
      this.save();
  }

  getRoundHistory(): RoundLog[] {
      return this.roundHistory;
  }

  exportDatabase(): string {
      const data = {
          users: this.users,
          house: this.house,
          tickets: this.tickets,
          config: this.config,
          roundHistory: this.roundHistory,
          systemLogs: this.systemLogs,
          vouchers: this.vouchers
      };
      this.logSystemAction(ROOT_USER, 'DB_EXPORT', 'Database exported');
      return JSON.stringify(data, null, 2);
  }

  importDatabase(jsonString: string): boolean {
      try {
          const data = JSON.parse(jsonString);
          if (data.users && data.house) {
              this.users = data.users;
              this.house = data.house;
              this.tickets = data.tickets || [];
              this.config = data.config || DEFAULT_CONFIG;
              this.roundHistory = data.roundHistory || [];
              this.systemLogs = data.systemLogs || [];
              this.vouchers = data.vouchers || [];
              this.logSystemAction(ROOT_USER, 'DB_IMPORT', 'Database imported/restored', 'critical');
              this.save();
              return true;
          }
      } catch (e) {
          console.error("Import Failed", e);
      }
      return false;
  }

  // --- USER API ---

  registerUser(phone: string, password: string): { success: boolean; message?: string; user?: UserAccount } {
    if (this.users[phone]) {
      return { success: false, message: 'User already exists' };
    }

    const newUser: UserAccount = {
      phone,
      password,
      balance: 0,
      demoBalance: 50000, 
      role: 'user',
      joinedAt: Date.now(),
      totalDeposited: 0,
      totalWithdrawn: 0,
      isBanned: false,
      isFrozen: false,
      history: [],
      ip: '197.232.' + Math.floor(Math.random()*255) + '.' + Math.floor(Math.random()*255) // Mock IP
    };

    this.users[phone] = newUser;
    this.save();
    return { success: true, user: newUser };
  }

  loginUser(identifier: string, password?: string, isDemo: boolean = false): { success: boolean; message?: string; user?: UserAccount } {
    if (isDemo) {
        let user = this.users[identifier];
        if (!user) {
            user = {
                phone: identifier,
                password: '',
                balance: 0,
                demoBalance: 50000,
                role: 'user',
                joinedAt: Date.now(),
                totalDeposited: 0,
                totalWithdrawn: 0,
                isBanned: false,
                isFrozen: false,
                history: []
            };
            this.users[identifier] = user;
            this.save();
        }
        return { success: true, user };
    }

    const user = this.users[identifier];
    
    if (!user) return { success: false, message: 'Account not found' };
    if (user.isBanned) return { success: false, message: 'Account suspended. Contact Support.' };
    if (user.password !== password) {
        // Log failed attempt for admin
        if (identifier === ROOT_USER) {
            this.logSystemAction('system', 'FAILED_LOGIN', `Failed root login attempt`, 'warning');
        }
        return { success: false, message: 'Invalid credentials' };
    }

    if (user.role === 'admin') {
         this.logSystemAction(user.phone, 'LOGIN', 'Admin login successful');
    }

    return { success: true, user };
  }

  getUser(phone: string): UserAccount | null {
    return this.users[phone] || null;
  }

  getAllUsers(): UserAccount[] {
    return Object.values(this.users);
  }

  // --- ADMIN ACTIONS ---

  deleteUser(phone: string): boolean {
      if (!this.users[phone] || phone === ROOT_USER) return false;
      delete this.users[phone];
      this.logSystemAction(ROOT_USER, 'DELETE_USER', `Deleted user ${phone}`, 'critical');
      this.save();
      return true;
  }

  banUser(phone: string, status: boolean) {
      if (this.users[phone] && phone !== ROOT_USER) {
          this.users[phone].isBanned = status;
          this.logSystemAction(ROOT_USER, status ? 'BAN_USER' : 'UNBAN_USER', `User ${phone}`);
          this.save();
      }
  }

  freezeUserFunds(phone: string, status: boolean) {
      if (this.users[phone] && phone !== ROOT_USER) {
          this.users[phone].isFrozen = status;
          this.logSystemAction(ROOT_USER, status ? 'FREEZE_FUNDS' : 'UNFREEZE_FUNDS', `User ${phone}`);
          this.save();
      }
  }

  resetUserPassword(phone: string) {
      if (this.users[phone] && phone !== ROOT_USER) {
          this.users[phone].password = '1234';
          this.logSystemAction(ROOT_USER, 'RESET_PASSWORD', `Reset password for ${phone} to 1234`);
          this.save();
          return true;
      }
      return false;
  }

  setBalance(phone: string, amount: number): number {
      const user = this.users[phone];
      if (!user) return 0;
      
      const diff = amount - user.balance;
      user.balance = amount;
      
      user.history.push({
          type: 'admin_adjust',
          amount: diff,
          timestamp: Date.now(),
          balanceAfter: amount,
          note: 'Admin manual adjustment'
      });
      
      this.logSystemAction(ROOT_USER, 'BALANCE_ADJUST', `Set balance for ${phone} to ${amount}`);
      this.save();
      return user.balance;
  }

  updateBalance(phone: string, amount: number, type: Transaction['type'], isDemo: boolean = false, multiplier?: number, roomName?: string, note?: string): number {
    const user = this.users[phone];
    if (!user) return 0;

    if (!isDemo && user.isFrozen && amount < 0) {
        throw new Error("Account Funds Frozen");
    }

    if (isDemo) {
        user.demoBalance += amount;
    } else {
        user.balance += amount;
        if (type === 'deposit') user.totalDeposited += amount;
        if (type === 'withdraw') user.totalWithdrawn += Math.abs(amount);
    }

    user.history.push({
        type,
        amount,
        multiplier,
        timestamp: Date.now(),
        balanceAfter: isDemo ? user.demoBalance : user.balance,
        roomName,
        note,
        isDemo
    });

    if (user.history.length > 100) user.history = user.history.slice(user.history.length - 100);

    this.save();
    return isDemo ? user.demoBalance : user.balance;
  }

  // --- SUPPORT TICKETS ---
  
  createTicket(userPhone: string, subject: string, message: string) {
      const ticket: SupportTicket = {
          id: Math.random().toString(36).substring(2, 9),
          userPhone,
          subject,
          message,
          status: 'open',
          createdAt: Date.now()
      };
      this.tickets.push(ticket);
      this.save();
  }

  getTickets() {
      return this.tickets;
  }

  resolveTicket(id: string, response: string) {
      const ticket = this.tickets.find(t => t.id === id);
      if (ticket) {
          ticket.status = 'resolved';
          ticket.adminResponse = response;
          this.logSystemAction(ROOT_USER, 'RESOLVE_TICKET', `Resolved ticket ${id}`);
          this.save();
      }
  }
}

export const dbService = new DBService();
