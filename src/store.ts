import { supabase } from './supabaseClient';
import { Employee, AttendanceRecord, WFHRequest, AccountRequest } from './types';

const db = {
  from: (table: string) => {
    if (!supabase) return null;
    try { return supabase.from(table); } catch { return null; }
  }
};

function getPKTDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const LOCATION_MAP: Record<string, string> = {
  '103.93.13.182': 'Zone', '103.93.13.18': 'Zone',
  '202.141.254.126': 'QC Center', '157.10.30.235': 'QC Center',
};
export const ALL_ALLOWED_IPS = ['202.141.254.126', '157.10.30.235', '103.93.13.182', '103.93.13.18'];
export function getLocationFromIP(ip: string): string { return LOCATION_MAP[ip] || 'Office'; }

function cacheSet(key: string, data: any) { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }
function cacheGet<T>(key: string, fallback: T): T { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch { return fallback; } }

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'emp-001', name: 'Abdul Wahab', role: 'admin', pin: '2687', avatar: 'AW' },
  { id: 'emp-002', name: 'Hamza Saeed', role: 'employee', pin: '2345', avatar: 'HS' },
  { id: 'emp-003', name: 'Ishtiaq ur Rehman', role: 'employee', pin: '3456', avatar: 'IR' },
  { id: 'emp-004', name: 'Behzad Riaz', role: 'employee', pin: '4567', avatar: 'BR' },
  { id: 'emp-005', name: 'Albash Akhtar', role: 'manager', pin: '8822', avatar: 'AA' },
  { id: 'emp-006', name: 'Sohail', role: 'employee', pin: '1122', avatar: 'SH' },
];

export function getEmployees(): Employee[] { return cacheGet('c_emp', DEFAULT_EMPLOYEES); }
export function getAttendanceEmployees(): Employee[] { return getEmployees().filter(e => e.role !== 'manager'); }
export function saveEmployees(e: Employee[]) { cacheSet('c_emp', e); }

// Auto-seed and sync with the correct 'users' table in Supabase
async function syncEmployees() {
  try {
    const q = db.from('users'); if (!q) return;
    
    // Seed default users first to satisfy Foreign Key constraints
    const seedRows = DEFAULT_EMPLOYEES.map(e => ({
      id: parseInt(e.id.replace(/^\D+/g, ''), 10),
      name: e.name,
      role: e.role,
      password: e.pin
    }));
    await q.upsert(seedRows);

    const { data } = await q.select('*');
    if (data && data.length > 0) {
      const mapped = data.map((u: any) => ({
        id: `emp-00${u.id}`,
        name: u.name,
        role: u.role,
        pin: u.password || '1122',
        avatar: u.name ? u.name.split(' ').map((n: any) => n[0]).join('').toUpperCase() : 'EM'
      }));
      cacheSet('c_emp', mapped);
    }
  } catch {}
}

export async function addEmployee(emp: Employee) {
  const all = getEmployees(); all.push(emp); cacheSet('c_emp', all);
  try { 
    const q = db.from('users'); 
    const nid = parseInt(emp.id.replace(/^\D+/g, ''), 10) || Math.floor(Math.random() * 1000);
    if (q) { await q.upsert({ id: nid, name: emp.name, role: emp.role, password: emp.pin }); await syncEmployees(); } 
  } catch {}
}

export async function updateEmployeePin(empId: string, newPin: string) {
  const all = getEmployees(); const idx = all.findIndex(e => e.id === empId);
  if (idx !== -1) { all[idx].pin = newPin; cacheSet('c_emp', all); }
  try { 
    const q = db.from('users'); 
    const nid = parseInt(empId.replace(/^\D+/g, ''), 10);
    if (q) { await q.update({ password: newPin }).eq('id', nid); await syncEmployees(); } 
  } catch {}
}

export async function removeEmployee(empId: string) {
  cacheSet('c_emp', getEmployees().filter(e => e.id !== empId));
  try { 
    const q = db.from('users'); 
    const nid = parseInt(empId.replace(/^\D+/g, ''), 10);
    if (q) { await q.delete().eq('id', nid); await syncEmployees(); } 
  } catch {}
}

export function getAttendanceRecords(): AttendanceRecord[] { return cacheGet('c_rec', []); }
export function saveAttendanceRecords(r: AttendanceRecord[]) { cacheSet('c_rec', r); }

async function syncRecords() {
  try {
    const q = db.from('attendance_logs'); if (!q) return;
    const { data } = await q.select('*');
    if (data) {
      cacheSet('c_rec', data.map((r: any) => ({
        id: String(r.id), 
        employeeId: r.user_id ? `emp-00${r.user_id}` : 'emp-001',
        date: r.date, 
        checkIn: r.login_time, 
        checkOut: r.login_time, 
        status: r.status || 'present', 
        totalHours: 0, 
        wifiVerified: r.wifi_connected === 'true' || r.wifi_connected === true, 
        ipAddress: 'Office', 
        notes: '',
      })));
    }
  } catch {}
}

export async function addAttendanceRecord(record: AttendanceRecord) {
  const numericUserId = parseInt(record.employeeId.replace(/^\D+/g, ''), 10) || 1;
  const employees = getEmployees();
  const currentEmp = employees.find(e => e.id === record.employeeId);

  try { 
    const q = db.from('attendance_logs'); 
    if (q) {
      await q.insert({
        user_id: numericUserId,
        user_name: currentEmp ? currentEmp.name : 'Abdul Wahab',
        date: record.date,
        status: record.status,
        login_time: record.checkIn,
        wifi_connected: record.wifiVerified ? 'true' : 'false'
      });
      
      const records = getAttendanceRecords();
      if (!records.find(r => r.employeeId === record.employeeId && r.date === record.date)) {
        records.push(record);
        cacheSet('c_rec', records);
      }
      await syncRecords(); 
    }
  } catch {}
}

export async function updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>) {
  const records = getAttendanceRecords(); const idx = records.findIndex(r => r.id === id);
  if (idx !== -1) { records[idx] = { ...records[idx], ...updates }; cacheSet('c_rec', records); }
  
  const targetRecord = records.find(r => r.id === id);
  if (!targetRecord) return;
  const numericUserId = parseInt(targetRecord.employeeId.replace(/^\D+/g, ''), 10) || 1;

  try {
    const q = db.from('attendance_logs'); if (!q) return;
    const d: any = {};
    if (updates.status !== undefined) d.status = updates.status;
    if (updates.checkIn !== undefined) d.login_time = updates.checkIn;
    
    await q.update(d).eq('user_id', numericUserId).eq('date', targetRecord.date);
    await syncRecords();
  } catch {}
}

export function getTodayRecord(empId: string): AttendanceRecord | undefined {
  const todayStr = getPKTDateString();
  return getAttendanceRecords().find(r => r.employeeId === empId && r.date === todayStr);
}

export function getWFHRequests(): WFHRequest[] { return cacheGet('c_wfh', []); }
export function getTodayWFHRequest(empId: string): WFHRequest | undefined {
  const todayStr = getPKTDateString();
  return getWFHRequests().find(r => r.employeeId === empId && r.date === todayStr);
}
export function getPendingWFHRequests(): WFHRequest[] { return getWFHRequests().filter(r => r.status === 'pending'); }
export function getAccountRequests(): AccountRequest[] { return cacheGet('c_acct', []); }
export function getPendingAccountRequests(): AccountRequest[] { return getAccountRequests().filter(r => r.status === 'pending'); }

export function getSettings() {
  return cacheGet('c_settings', { officeStartTime: '09:00', lateThresholdMinutes: 15, minHoursForFullDay: 8, minHoursForHalfDay: 4 });
}
export function saveSettings(s: any) { cacheSet('c_settings', s); }

export interface EmployeeTiming {
  employeeId: string; officeStartTime: string; lateThresholdMinutes: number;
  minHoursForFullDay: number; minHoursForHalfDay: number;
}
export function getAllEmployeeTimings(): Record<string, EmployeeTiming> { return cacheGet('c_timings', {}); }
export function getEmployeeTiming(empId: string): EmployeeTiming {
  const all = getAllEmployeeTimings(); if (all[empId]) return all[empId];
  const g = getSettings();
  return { employeeId: empId, officeStartTime: g.officeStartTime, lateThresholdMinutes: g.lateThresholdMinutes, minHoursForFullDay: g.minHoursForFullDay, minHoursForHalfDay: g.minHoursForHalfDay };
}

const DEFAULT_ACCESS: Record<string, string[]> = {
  ot:['emp-001','emp-005'], ai:['emp-001','emp-005'], analytics:['emp-001','emp-005'],
  settings:['emp-001','emp-005'], pin_change:['emp-001','emp-005'],
  add_employee:['emp-001','emp-005'], remove_employee:['emp-001','emp-005'],
  timings:['emp-001'], wfh_approve:['emp-001','emp-005'],
  secret_override:['emp-001'], view_all:['emp-001','emp-005'],
};
export function getAccessControl(): Record<string, string[]> { return cacheGet('c_access', DEFAULT_ACCESS); }
export function saveAccessControl(ac: Record<string, string[]>) { cacheSet('c_access', ac); }

export async function syncAll() {
  try {
    await syncEmployees();
    await syncRecords();
  } catch {}
}

export async function initializeApp() {
  try {
    await syncAll();
  } catch (e) {
    console.warn('Sync failed, using local cache:', e);
  }
}
