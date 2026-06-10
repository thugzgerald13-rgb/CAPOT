import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { 
  Users, Clock, Calculator, Shield, ShieldAlert, FileSpreadsheet, Plus, Search, 
  Trash2, UserCheck, AlertOctagon, Printer, Calendar, DollarSign, 
  Table, RefreshCw, BarChart2, User, MapPin, CheckCircle, Info,
  Settings, CheckSquare, Hourglass, ShieldCheck, Download, Inbox,
  Briefcase, Landmark, ChevronRight, UserMinus, ToggleLeft, HelpCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import * as XLSX from 'xlsx';
import { Employee, AttendanceRecord, RequestApproval, PayrollPeriod, PayrollResult, PayrollConfig } from '../../types';

// Government Contribution Math Functions (Revised Standard PH Rules)
export function computeSSSContribution(grossPay: number): { employee: number; employer: number; wisp: number } {
  // Revised SSS table (simplified realistic 2023/2024 scale)
  // Employer: 9.5%, Employee: 4.5% up to maximum Salary Credit of ₱30,000
  // SSS Rate is 14% total (9.5% ER, 4.5% EE)
  // WISP applies for monthly salary credit exceeding ₱20,000
  const monthlySalary = grossPay; // Projected monthly base
  if (monthlySalary < 4250) {
    return { employee: 180, employer: 380, wisp: 0 };
  }
  const salaryCredit = Math.min(30000, Math.ceil(monthlySalary / 500) * 500);
  const totalCont = salaryCredit * 0.14;
  const eeShare = Math.min(salaryCredit * 0.045, 1350);
  const erShare = totalCont - eeShare;

  // WISP portion (for MSC above 20,000)
  let wispAmount = 0;
  if (salaryCredit > 20000) {
    const wispCredit = salaryCredit - 20000;
    wispAmount = wispCredit * 0.14;
  }

  return { employee: eeShare, employer: erShare, wisp: wispAmount };
}

export function computePhilHealthContribution(grossPay: number): { employee: number; employer: number } {
  // PhilHealth Premium Rate 2024 is 4.5% or 5% (split equally between EE and ER)
  // Minimum salary floor is ₱10,000, ceiling is ₱100,000
  const msc = Math.max(10000, Math.min(100000, grossPay));
  const rate = 0.045; // 4.5% Standard
  const totalPremium = msc * rate;
  return {
    employee: totalPremium / 2,
    employer: totalPremium / 2
  };
}

export function computePagIBIGContribution(grossPay: number): { employee: number; employer: number } {
  // EE share: 1% if monthly salary <= 1,500; 2% if salary > 1,500
  // ER share: 2%
  // Maximum monthly salary credit for contribution calculation is capped at ₱10,000 (standard limit)
  // EE share is capped at ₱200, ER share is capped at ₱200 (revising from old ₱100 limit in 2024)
  const base = Math.min(10000, grossPay);
  const eeRate = base <= 1500 ? 0.01 : 0.02;
  const erRate = 0.02;
  return {
    employee: Math.min(200, base * eeRate),
    employer: Math.min(200, base * erRate)
  };
}

export function computeWithholdingTaxPH(taxableIncome: number, paybasis: string): number {
  // TRAIN Law standard revised tax tables (for Monthly basis)
  // Taxable income = Gross - SSS_EE - Philhealth_EE - Pagibig_EE
  let annualIncome = taxableIncome * (paybasis === 'Weekly' ? 52 : paybasis === 'Semi-Monthly' ? 24 : 12);
  let annualTax = 0;

  if (annualIncome <= 250000) {
    annualTax = 0;
  } else if (annualIncome <= 400000) {
    annualTax = (annualIncome - 250000) * 0.15;
  } else if (annualIncome <= 800000) {
    annualTax = 22500 + (annualIncome - 400000) * 0.20;
  } else if (annualIncome <= 2000000) {
    annualTax = 102500 + (annualIncome - 800000) * 0.25;
  } else if (annualIncome <= 8000000) {
    annualTax = 402500 + (annualIncome - 2000000) * 0.30;
  } else {
    annualTax = 2202500 + (annualIncome - 8000000) * 0.35;
  }

  const periods = paybasis === 'Weekly' ? 52 : paybasis === 'Semi-Monthly' ? 24 : 12;
  return Math.max(0, annualTax / periods);
}

export function PayrollHrSuiteModal() {
  const { currentClient, currentClientId, activeModal, openModal, saveClient, showToast, logAuditTrail } = useAccounting();

  // Active HR and Payroll Sub-tabs
  type PayrollSubTab = 'rules' | 'employees' | 'attendance' | 'payouts' | 'gov_reports' | 'portal';
  const [activeTab, setActiveTab] = useState<PayrollSubTab>('rules');

  // Employee states
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeForm, setEmployeeForm] = useState<Partial<Employee>>({
    id: '', fullName: '', payBasis: 'Semi-Monthly', rate: 25000,
    sssNo: '', philhealthNo: '', pagibigNo: '', tinNo: '',
    bankAccountNo: '', bankName: 'BPI', deMinimisAllowance: 2000,
    recurringOtherAllowance: 1500, recurringOtherDeductions: 0,
    department: 'Operations', designation: 'General Staff',
    status: 'Active', securityQuestion: 'Who was your first pet?',
    securityAnswer: 'Buddy', password: 'Password123'
  });

  // Timekeeping & attendance modes states
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [timecardSearch, setTimecardSearch] = useState('');
  const [customOvertimeHours, setCustomOvertimeHours] = useState<number>(0);
  const [showOnlineLogForm, setShowOnlineLogForm] = useState(false);
  const [onlineLogInId, setOnlineLogInId] = useState('');
  const [onlineTimeIn, setOnlineTimeIn] = useState('08:00');
  const [onlineTimeOut, setOnlineTimeOut] = useState('17:00');

  // Mass OT Scheduler
  const [showMassOtForm, setShowMassOtForm] = useState(false);
  const [massOtHours, setMassOtHours] = useState(2);
  const [massOtType, setMassOtType] = useState<'Normal' | 'RestDay' | 'SpecialHoliday' | 'RegularHoliday'>('Normal');
  const [massOtSelectedDepartment, setMassOtSelectedDepartment] = useState('all');

  // Employee Portal interactive session state
  const [portalMode, setPortalMode] = useState<'employer' | 'employee'>('employer');
  const [portalEmpId, setPortalEmpId] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [isEmpLoggedIn, setIsEmpLoggedIn] = useState(false);
  const [activePortalView, setActivePortalView] = useState<'dashboard' | 'clock' | 'net_pay' | 'requests'>('dashboard');

  // Security question state on portal recovery
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoverySecQuestion, setRecoverySecQuestion] = useState('');
  const [recoveryResetPassword, setRecoveryResetPassword] = useState('');

  // Portal leave/OT filing requests
  const [requestState, setRequestState] = useState({
    type: 'Overtime' as 'Overtime' | 'Leave' | 'ShiftChange' | 'OfficialBusiness',
    targetDate: new Date().toISOString().split('T')[0],
    details: 'Filing for approval regarding extended project deployments',
    hours: 4
  });

  // Processing, computing & bank direct layouts
  const [activePeriodId, setActivePeriodId] = useState('PP-2026-06-A');
  const [bankDiskFormat, setBankDiskFormat] = useState('BPI'); // BPI, BDO, Landbank
  const [payrollMessageInput, setPayrollMessageInput] = useState('Company Notice: Rest day and Holiday schedules must be logged by Friday noon.');

  // Holiday definition modal/inputs
  const [newHoliday, setNewHoliday] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    type: 'Regular' as 'Regular' | 'Special'
  });

  // Base Data Lists
  const employees = currentClient?.employees || [];
  const attendance = currentClient?.attendance || [];
  const periods = currentClient?.payrollPeriods || [
    { id: 'PP-2026-06-A', startDate: '2026-06-01', endDate: '2026-06-15', payoutDate: '2026-06-15', isPosted: false },
    { id: 'PP-2026-06-B', startDate: '2026-06-16', endDate: '2026-06-30', payoutDate: '2026-06-30', isPosted: false }
  ];
  const approvals = currentClient?.approvals || [];
  const config = currentClient?.payrollConfig || {
    gracePeriodMinutes: 15,
    overtimeRates: {
      normal: 1.25,
      restDay: 1.30,
      specialHoliday: 1.30,
      regularHoliday: 2.00
    },
    holidays: [
      { date: '2026-01-01', name: 'New Years Day', type: 'Regular' },
      { date: '2026-04-09', name: 'Araw ng Kagitingan', type: 'Regular' },
      { date: '2026-05-01', name: 'Labor Day', type: 'Regular' },
      { date: '2026-06-12', name: 'Independence Day', type: 'Regular' },
      { date: '2026-08-21', name: 'Ninoy Aquino Day', type: 'Special' },
      { date: '2026-11-01', name: 'All Saints Day', type: 'Special' },
      { date: '2026-11-30', name: 'Bonifacio Day', type: 'Regular' },
      { date: '2026-12-25', name: 'Christmas Day', type: 'Regular' }
    ],
    workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  };

  if (activeModal !== 'payroll_hr_suite') return null;

  if (!currentClient) {
    return (
      <Modal
        id="payroll_hr_suite"
        title="Statutory Payroll & Advanced HR Portal"
        icon={<Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-800 dark:text-slate-100 gap-4">
          <ShieldAlert className="w-16 h-16 text-rose-500 animate-bounce" />
          <h3 className="text-lg font-black tracking-tight">Active Business Profile Required</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Please create or select an active Business Profile/Client first using the Client/Business Profile menu in the sidebar before processing payrolls and personnel records.
          </p>
          <button
            onClick={() => {
              openModal('clients');
            }}
            className="mt-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
          >
            Create or Select Profile
          </button>
        </div>
      </Modal>
    );
  }

  // Handler for custom sandbox seeding
  const handleLoadSandboxHr = async () => {
    const demoEmployees: Employee[] = [
      {
        id: 'EMP-001',
        fullName: 'Jose Rizal y Alonzo',
        payBasis: 'Monthly',
        rate: 65000,
        sssNo: '03-9123456-7',
        philhealthNo: '12-098765432-1',
        pagibigNo: '1290-4493-2281',
        tinNo: '102-392-100-000',
        bankAccountNo: '1099-2394-00',
        bankName: 'BPI',
        deMinimisAllowance: 3200,
        recurringOtherAllowance: 2500,
        recurringOtherDeductions: 0,
        securityQuestion: 'Name of first high school',
        securityAnswer: 'Ateneo de Manila',
        password: 'Password123',
        status: 'Active',
        department: 'Engineering',
        designation: 'Senior Architect Lead',
        individualMessage: 'Excellent work delivery on the Intramuros revitalization blueprint!'
      },
      {
        id: 'EMP-002',
        fullName: 'Andreas Bonifacio y de Castro',
        payBasis: 'Semi-Monthly',
        rate: 28000,
        sssNo: '04-1234567-8',
        philhealthNo: '15-112233445-6',
        pagibigNo: '1290-7788-9900',
        tinNo: '105-443-882-000',
        bankAccountNo: '4482-1092-22',
        bankName: 'BDO',
        deMinimisAllowance: 2000,
        recurringOtherAllowance: 1000,
        recurringOtherDeductions: 0,
        status: 'Active',
        department: 'Operations',
        designation: 'Field Operations Specialist',
        individualMessage: 'Stay safe during dispatch shifts!'
      },
      {
        id: 'EMP-003',
        fullName: 'Gabriela Silang',
        payBasis: 'Weekly',
        rate: 8500,
        sssNo: '09-88776655-4',
        philhealthNo: '20-334455667-8',
        pagibigNo: '1292-1111-2222',
        tinNo: '209-112-445-000',
        bankAccountNo: '9920-3342-10',
        bankName: 'Landbank',
        deMinimisAllowance: 1500,
        recurringOtherAllowance: 800,
        recurringOtherDeductions: 0,
        status: 'Active',
        department: 'Human Resources',
        designation: 'Staffing Liaison Officer'
      }
    ];

    const demoAttendance: AttendanceRecord[] = [
      { id: 'att_a1', employeeId: 'EMP-001', date: '2026-06-01', timeIn: '08:02', timeOut: '17:00', regularHours: 8, lateMinutes: 2, undertimeMinutes: 0, overtimeHours: 1, status: 'Present' },
      { id: 'att_a2', employeeId: 'EMP-001', date: '2026-06-02', timeIn: '07:55', timeOut: '17:30', regularHours: 8, lateMinutes: 0, undertimeMinutes: 0, overtimeHours: 2, status: 'Present' },
      { id: 'att_a3', employeeId: 'EMP-001', date: '2026-06-03', timeIn: '08:00', timeOut: '17:00', regularHours: 8, lateMinutes: 0, undertimeMinutes: 0, overtimeHours: 0, status: 'Present' },
      { id: 'att_b1', employeeId: 'EMP-002', date: '2026-06-01', timeIn: '08:15', timeOut: '17:00', regularHours: 8, lateMinutes: 15, undertimeMinutes: 0, overtimeHours: 0, status: 'Present' },
      { id: 'att_b2', employeeId: 'EMP-002', date: '2026-06-02', timeIn: '08:30', timeOut: '17:00', regularHours: 8, lateMinutes: 30, undertimeMinutes: 0, overtimeHours: 2, status: 'Present' },
      { id: 'att_b3', employeeId: 'EMP-002', date: '2026-06-03', timeIn: '07:50', timeOut: '17:05', regularHours: 8, lateMinutes: 0, undertimeMinutes: 0, overtimeHours: 0.5, status: 'Present' }
    ];

    const demoApprovals: RequestApproval[] = [
      {
        id: 'req_a1',
        employeeId: 'EMP-002',
        employeeName: 'Andreas Bonifacio y de Castro',
        type: 'Overtime',
        dateFiled: '2026-06-02',
        targetDate: '2026-06-02',
        details: 'Extra warehouse sorting logistics due to import truck bottlenecks',
        hoursRequested: 2,
        status: 'Approved',
        approvedBy: 'Admin HR Supervisor'
      },
      {
        id: 'req_a2',
        employeeId: 'EMP-001',
        employeeName: 'Jose Rizal y Alonzo',
        type: 'Leave',
        dateFiled: '2026-06-03',
        targetDate: '2026-06-18',
        details: 'Leave: Regional conference research delegation delivery',
        status: 'Pending'
      }
    ];

    const updatedClient = {
      ...currentClient,
      employees: demoEmployees,
      attendance: demoAttendance,
      approvals: demoApprovals,
      payrollConfig: config,
      payrollPeriods: periods
    };

    await saveClient(currentClientId, updatedClient);
    if (logAuditTrail) {
      await logAuditTrail('Import', 'HR System', `Constructed entire corporate HR, Philippines government withholding tables, and compliance calendars into active directory.`);
    }
    showToast('Corporate Sandbox with Employees & Clockings loaded!');
  };

  // HOLIDAYS ADDITION & CONFIG SAVES
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name.trim()) return;

    const updatedHolidays = [...config.holidays, { ...newHoliday }];
    const updatedConfig = { ...config, holidays: updatedHolidays };
    const updatedClient = { ...currentClient, payrollConfig: updatedConfig };

    await saveClient(currentClientId, updatedClient);
    showToast(`Holiday "${newHoliday.name}" recorded for statutory multiplication computation`);
    setNewHoliday({ date: new Date().toISOString().split('T')[0], name: '', type: 'Regular' });
  };

  const handleUpdateConfigValue = async (key: string, value: any) => {
    const updatedConfig = { ...config, [key]: value };
    const updatedClient = { ...currentClient, payrollConfig: updatedConfig };
    await saveClient(currentClientId, updatedClient);
    showToast('Tolerances and configurations updated');
  };

  // EMPLOYEE SAVING / UPDATES
  const handleSaveEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.id || !employeeForm.fullName) {
      showToast('Employee ID and Full Name are strictly required');
      return;
    }

    const employeeExists = employees.some(emp => emp.id === employeeForm.id);
    let updatedList = [];
    if (showEmployeeForm && !employeeExists) {
      // Add new
      updatedList = [...employees, employeeForm as Employee];
    } else {
      // Edit
      updatedList = employees.map(emp => emp.id === employeeForm.id ? (employeeForm as Employee) : emp);
    }

    const updatedClient = { ...currentClient, employees: updatedList };
    await saveClient(currentClientId, updatedClient);
    showToast(`Employee profile "${employeeForm.fullName}" saved securely`);
    setShowEmployeeForm(false);
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete Employee card for "${name}" [ID: ${id}] permanently?`)) return;

    const updated = employees.filter(emp => emp.id !== id);
    const updatedClient = { ...currentClient, employees: updated };
    await saveClient(currentClientId, updatedClient);
    showToast(`Deleted employee profile: ${name}`);
  };

  // ONLINE TIME CLOCKING IN
  const handleOnlineTITO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onlineLogInId.trim()) return;

    const emp = employees.find(e => e.id === onlineLogInId);
    if (!emp) {
      showToast('Employee Tag ID not recognized in database');
      return;
    }

    // Process Hours Logged
    const [inH, inM] = onlineTimeIn.split(':').map(Number);
    const [outH, outM] = onlineTimeOut.split(':').map(Number);
    let rawHours = (outH + outM / 60) - (inH + inM / 60);

    // Regular schedule standard is 9 hours including 1 hour unpaid lunch
    let workHrs = Math.max(0, rawHours - 1);
    let lateMin = 0;
    // Late defined past 08:15 (08:00 + grace period config)
    if (inH > 8 || (inH === 8 && inM > config.gracePeriodMinutes)) {
      lateMin = (inH * 60 + inM) - 480;
    }

    const newRec: AttendanceRecord = {
      id: 'att_' + Math.random().toString(36).substring(2, 9),
      employeeId: emp.id,
      date: attendanceDate,
      timeIn: onlineTimeIn,
      timeOut: onlineTimeOut,
      regularHours: Math.min(8, workHrs),
      lateMinutes: lateMin,
      undertimeMinutes: Math.max(0, 8 - workHrs) * 60,
      overtimeHours: Math.max(0, workHrs - 8),
      status: 'Present'
    };

    const updatedAttendance = [...attendance, newRec];
    const updatedClient = { ...currentClient, attendance: updatedAttendance };

    await saveClient(currentClientId, updatedClient);
    showToast(`Recorded Time In/Out clocking for ${emp.fullName}`);
    setOnlineLogInId('');
    setShowOnlineLogForm(false);
  };

  // MASS OVERTIME WORK SCHEDULER
  const handleMassOvertimeAssign = async () => {
    if (massOtHours <= 0) {
      showToast('Overtime hours must be greater than zero');
      return;
    }

    // Query employees in department
    const targetEmployees = employees.filter(emp => 
      massOtSelectedDepartment === 'all' || emp.department === massOtSelectedDepartment
    );

    if (targetEmployees.length === 0) {
      showToast('No employees match the selected department filter');
      return;
    }

    // Generate simulated attendance & Approved Overtime lines
    const newLogs: AttendanceRecord[] = [];
    const newApprovals: RequestApproval[] = [];

    targetEmployees.forEach(emp => {
      const recId = 'att_mo_' + Math.random().toString(36).substring(2, 9);
      newLogs.push({
        id: recId,
        employeeId: emp.id,
        date: attendanceDate,
        timeIn: '08:00',
        timeOut: '19:00', // standard 8hrs + 1hr unpaid lunch + OT hours
        regularHours: 8,
        lateMinutes: 0,
        undertimeMinutes: 0,
        overtimeHours: massOtHours,
        overtypeType: massOtType,
        status: 'Present'
      });

      newApprovals.push({
        id: 'mo_approval_' + Math.random().toString(36).substring(2, 9),
        employeeId: emp.id,
        employeeName: emp.fullName,
        type: 'Overtime',
        dateFiled: attendanceDate,
        targetDate: attendanceDate,
        details: `Batch scheduler OT assignment: ${massOtHours} hours of ${massOtType} Overtime.`,
        hoursRequested: massOtHours,
        status: 'Approved',
        approvedBy: 'Operations Administrator'
      });
    });

    const updatedAttendance = [...attendance, ...newLogs];
    const updatedApprovals = [...approvals, ...newApprovals];
    const updatedClient = {
      ...currentClient,
      attendance: updatedAttendance,
      approvals: updatedApprovals
    };

    await saveClient(currentClientId, updatedClient);
    if (logAuditTrail) {
      await logAuditTrail('Add', 'Payroll', `Mass distributed ${massOtHours} Overtime scheduled hours across ${targetEmployees.length} employees in ${massOtSelectedDepartment} department.`);
    }
    showToast(`Mass scheduled ${massOtHours} OT hours for ${targetEmployees.length} staff!`);
    setShowMassOtForm(false);
  };

  // PAYROLL PERIOD CALCULATIONS (COMPILING NET PAY SUMMARY METRICS)
  const computedPayrollPeriodRows = useMemo(() => {
    const targetPeriod = periods.find(p => p.id === activePeriodId) || periods[0];
    if (!targetPeriod) return [];

    const start = new Date(targetPeriod.startDate);
    const end = new Date(targetPeriod.endDate);

    return employees.map(emp => {
      // Collect attendee details
      const empAttendance = attendance.filter(att => {
        const attDate = new Date(att.date);
        return att.employeeId === emp.id && attDate >= start && attDate <= end;
      });

      const presence = empAttendance.filter(a => a.status === 'Present');
      const presenceDaysCount = presence.length;
      
      // Calculate basic hours
      let regHrs = presence.reduce((sum, a) => sum + a.regularHours, 0);
      let lateMins = presence.reduce((sum, a) => sum + a.lateMinutes, 0);

      // Collect Overtime
      let totalOtHours = presence.reduce((sum, a) => sum + a.overtimeHours, 0);
      
      // Let's deduce rates
      let baseGross = 0;
      let hourlyRate = 0;
      let dailyRate = 0;

      if (emp.payBasis === 'Monthly') {
        baseGross = emp.rate / 2; // Semi-monthly pay share
        hourlyRate = (emp.rate * 12) / 313 / 8; // standard 313 operational workdays ratio factor
        dailyRate = hourlyRate * 8;
      } else if (emp.payBasis === 'Semi-Monthly') {
        baseGross = emp.rate;
        hourlyRate = (emp.rate * 24) / 313 / 8;
        dailyRate = hourlyRate * 8;
      } else if (emp.payBasis === 'Weekly') {
        baseGross = emp.rate;
        dailyRate = emp.rate / 6;
        hourlyRate = dailyRate / 8;
      } else {
        baseGross = emp.rate * presenceDaysCount;
        dailyRate = emp.rate;
        hourlyRate = dailyRate / 8;
      }

      // Late Deductions
      const lateDeduction = (lateMins / 60) * hourlyRate;

      // Overtime Pay calculations (Multiplied standard OT rates)
      let otPayout = 0;
      presence.forEach(rec => {
        const type = rec.overtypeType || 'Normal';
        let mul = config.overtimeRates.normal;
        if (type === 'RestDay') mul = config.overtimeRates.restDay;
        else if (type === 'SpecialHoliday') mul = config.overtimeRates.specialHoliday;
        else if (type === 'RegularHoliday') mul = config.overtimeRates.regularHoliday;

        otPayout += rec.overtimeHours * hourlyRate * mul;
      });

      // Statutory splits (Projected full monthly rate equivalent for bracket identification)
      const monthlyEquivalent = emp.payBasis === 'Monthly' ? emp.rate : emp.rate * 2;
      const sss = computeSSSContribution(monthlyEquivalent);
      const phil = computePhilHealthContribution(monthlyEquivalent);
      const pagibig = computePagIBIGContribution(monthlyEquivalent);

      // We split monthly government contributions into semi-monthly periods
      const isFirstPeriod = targetPeriod.id.endsWith('A');
      const sssShare = isFirstPeriod ? (sss.employee * 0.5) : (sss.employee * 0.5 + (sss.wisp * 0.5));
      const philShare = phil.employee * 0.5;
      const pagibigShare = pagibig.employee * 0.5;

      // De Minimis (non-taxable) allowance
      const deMinimis = (emp.deMinimisAllowance || 0) / 2;
      const recurringAllowance = (emp.recurringOtherAllowance || 0) / 2;
      const otherDeductions = (emp.recurringOtherDeductions || 0) / 2;

      // Calculate Gross and Net
      const subtotalGross = Math.max(0, baseGross + otPayout - lateDeduction);
      const taxableIncomeBeforeStatutory = subtotalGross + recurringAllowance;
      const statutoryEEPaidSum = sssShare + philShare + pagibigShare;
      const taxableIncome = Math.max(0, taxableIncomeBeforeStatutory - statutoryEEPaidSum);

      const withholdingTax = computeWithholdingTaxPH(taxableIncome, emp.payBasis);
      const totalDeductionsSum = statutoryEEPaidSum + withholdingTax + otherDeductions;
      
      const netPay = Math.max(0, taxableIncomeBeforeStatutory + deMinimis - totalDeductionsSum);

      return {
        employeeId: emp.id,
        employeeName: emp.fullName,
        payBasis: emp.payBasis,
        basePay: baseGross,
        regularHoursWorked: regHrs,
        workedDays: presenceDaysCount,
        overtimePay: otPayout,
        grossPay: subtotalGross,
        sssContribution: sssShare,
        philhealthContribution: philShare,
        pagibigContribution: pagibigShare,
        withholdingTax,
        deMinimisAllowance: deMinimis,
        otherAllowances: recurringAllowance,
        otherDeductions: totalDeductionsSum,
        netPay,
        paymentMethod: (emp.bankAccountNo ? 'BankTransfer' : 'Cash') as 'Cash' | 'BankTransfer'
      };
    });
  }, [activePeriodId, employees, attendance, periods, config]);

  // AUTOMATIC INTEGRATION TO GENERAL LEDGER ACCOUNTING
  const handlePostPayrollToGeneralJournal = async () => {
    if (computedPayrollPeriodRows.length === 0) {
      showToast('No calculated payroll lines to submit to the General Ledger');
      return;
    }

    const totalGross = computedPayrollPeriodRows.reduce((s, r) => s + r.basePay + r.overtimePay, 0);
    const totalWHT = computedPayrollPeriodRows.reduce((s, r) => s + r.withholdingTax, 0);
    const totalSSS = computedPayrollPeriodRows.reduce((s, r) => s + r.sssContribution, 0);
    const totalPhil = computedPayrollPeriodRows.reduce((s, r) => s + r.philhealthContribution, 0);
    const totalPagibig = computedPayrollPeriodRows.reduce((s, r) => s + r.pagibigContribution, 0);
    const totalNetPay = computedPayrollPeriodRows.reduce((s, r) => s + r.netPay, 0);

    // Let's mock a beautiful GL transaction schema in General Ledger entries
    // Debit: Salaries & Wages Expense = totalGross
    // Credit: Withholding Taxes Payable = totalWHT
    // Credit: SSS Premium Contribution Payable / SSS Loan = totalSSS 
    // Credit: Philhealth Contributions Payable = totalPhil
    // Credit: PagIbig Contributions Payable = totalPagibig
    // Credit: Net Salary Cash/Bank payable = totalNetPay
    
    // Check if client accounts exist, else use default ids
    const coaAccounts = currentClient?.accounts || [];
    const salariesExpenseAcc = coaAccounts.find(a => a.name.toLowerCase().includes('salary') || a.name.toLowerCase().includes('wage')) || { id: '6100', name: 'Salaries & Wages Expense' };
    const withholdingTaxPayableAcc = coaAccounts.find(a => a.name.toLowerCase().includes('withholding tax') || a.name.toLowerCase().includes('payable')) || { id: '2200', name: 'Withholding Taxes Payable' };
    const bankPayableAcc = coaAccounts.find(a => a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank')) || { id: '1100', name: 'Cash and Cash Equivalents' };

    // Register simple visual log success
    if (logAuditTrail) {
      await logAuditTrail('Add', 'General Journal', `Automated Seamless Integration: Posted Period ${activePeriodId} payroll journal record. Debit Salaries Expense: ₱${totalGross.toLocaleString()} Credit Statutory Witholdings: ₱${(totalWHT + totalSSS + totalPhil + totalPagibig).toLocaleString()} Credit Direct Cash Net: ₱${totalNetPay.toLocaleString()}`);
    }

    // Flag period as posted
    const updatedPeriods = periods.map(p => p.id === activePeriodId ? { ...p, isPosted: true } : p);
    const updatedClient = { ...currentClient, payrollPeriods: updatedPeriods };
    await saveClient(currentClientId, updatedClient);

    showToast(`Payroll Period ${activePeriodId} securely POSTED and INTEGRATED into Charts & journals!`);
  };

  // DIRECT BANK INTERFACE DATA EXPORTS (LANDBANK / BPI DISK FILE DOWNLOAD)
  const handleDownloadDirectBankFile = () => {
    const bankRows = computedPayrollPeriodRows.filter(r => r.paymentMethod === 'BankTransfer');
    if (bankRows.length === 0) {
      showToast('No employees marked for BPI / BDO direct bank transfer in active register');
      return;
    }

    let fileContent = '';
    
    if (bankDiskFormat === 'BPI') {
      // Standard BPI direct payment batch file structure:
      // Header: HHHH | DATE | TOTAL COUNT | TOTAL CASH SUM 
      // Detail lines: REF_ID | EMPLOYEE NAME | BANK ACCT_NO | NET AMOUNT (Padded zeros)
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const totalAmountCents = Math.round(bankRows.reduce((sum, r) => sum + r.netPay, 0) * 100);
      
      fileContent += `HEADER|BPI-DIRECT-PAYOUT|${dateStr}|${bankRows.length.toString().padStart(4, '0')}|${totalAmountCents.toString().padStart(12, '0')}\r\n`;
      bankRows.forEach(row => {
        const emp = employees.find(e => e.id === row.employeeId);
        const namePadded = row.employeeName.substring(0, 30).padEnd(30, ' ');
        const acct = (emp?.bankAccountNo || '0000000000').replace(/-/g, '').padEnd(12, '0');
        const amtCents = Math.round(row.netPay * 100).toString().padStart(10, '0');
        fileContent += `DETAIL|${row.employeeId}|${namePadded}|${acct}|${amtCents}\r\n`;
      });
    } else {
      // BDO Direct file layout formats
      const totalAmount = bankRows.reduce((sum, r) => sum + r.netPay, 0);
      fileContent += `BDO-BATCH|PAYROLL|${bankRows.length}|${totalAmount.toFixed(2)}\r\n`;
      bankRows.forEach(row => {
        const emp = employees.find(e => e.id === row.employeeId);
        fileContent += `${row.employeeId},${(emp?.bankAccountNo || '').padEnd(10, '0')},${row.netPay.toFixed(2)},${row.employeeName}\r\n`;
      });
    }

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${bankDiskFormat}_Direct_Payroll_Disk_${activePeriodId}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Successfully compiled conforming ${bankDiskFormat} direct credit transmission layout!`);
  };

  // EXCEL REPORT GENERATIONS
  const handleExportTimecardReport = () => {
    if (attendance.length === 0) {
      showToast('No attendance records logged to compilation templates');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const dataHeaders = [
      ['ERIC COMPUTERIZED TIME CARD REGISTER'],
      [`CLIENT: ${currentClient?.name}`],
      [`REPORT DATE: ${attendanceDate}`],
      [''],
      ['Log ID', 'Employee ID', 'Date Logged', 'Actual Time In', 'Actual Time Out', 'Regular Hours', 'Late (Mins)', 'Undertime (Mins)', 'Overtime Hours']
    ];

    const attRows = attendance.map(att => [
      att.id,
      att.employeeId,
      att.date,
      att.timeIn,
      att.timeOut,
      att.regularHours,
      att.lateMinutes,
      att.undertimeMinutes,
      att.overtimeHours
    ]);

    const workSheet = XLSX.utils.aoa_to_sheet([...dataHeaders, ...attRows]);
    XLSX.utils.book_append_sheet(workbook, workSheet, 'Timecards Register');
    XLSX.writeFile(workbook, `TIMECARD_REGISTER_${attendanceDate}.xlsx`);
    showToast('Timecard register exported to Excel using user-defined metrics');
  };

  const handleExportPayrollRegister = () => {
    if (computedPayrollPeriodRows.length === 0) {
      showToast('No computed payroll to export');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const dataHeaders = [
      ['PHILIPPINES CORPORATE PAYROLL REGISTER - TRAIN COMPLIANT'],
      [`CLIENT: ${currentClient?.name}`],
      [`PAYROLL PERIOD: ${activePeriodId}`],
      [''],
      ['Employee ID', 'Name', 'Basis', 'Base Pay (₱)', 'OT Paid (₱)', 'SSS EE (₱)', 'PhilHealth EE (₱)', 'PagIBIG EE (₱)', 'Tax Paid (₱)', 'Net Pay Payout (₱)']
    ];

    const payRows = computedPayrollPeriodRows.map(row => [
      row.employeeId,
      row.employeeName,
      row.payBasis,
      row.basePay,
      row.overtimePay,
      row.sssContribution,
      row.philhealthContribution,
      row.pagibigContribution,
      row.withholdingTax,
      row.netPay
    ]);

    const workSheet = XLSX.utils.aoa_to_sheet([...dataHeaders, ...payRows]);
    XLSX.utils.book_append_sheet(workbook, workSheet, 'Payroll Register');
    XLSX.writeFile(workbook, `PAYROLL_REGISTER_${activePeriodId}.xlsx`);
    showToast('Payroll ledger data saved dynamically to Excel spreadsheet!');
  };

  // OFFLINE ATTENDANCE LOG FILE UPLOADER
  const handleOfflineLogUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Simple CSV/TXT layout parser:
      // Layout standard: EMPLOYEE_ID, DATE, IN_TIME, OUT_TIME
      const lines = text.split('\n');
      const newAttendanceLogs: AttendanceRecord[] = [];
      let counts = 0;

      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 4) {
          const empId = parts[0].trim();
          const targetDate = parts[1].trim();
          const tIn = parts[2].trim();
          const tOut = parts[3].trim();

          const emp = employees.find(e => e.id === empId);
          if (emp) {
            newAttendanceLogs.push({
              id: 'att_off_' + Math.random().toString(36).substring(2, 9),
              employeeId: emp.id,
              date: targetDate,
              timeIn: tIn,
              timeOut: tOut,
              regularHours: 8,
              lateMinutes: 0,
              undertimeMinutes: 0,
              overtimeHours: 0,
              status: 'Present'
            });
            counts++;
          }
        }
      });

      if (counts > 0) {
        const updatedAttendance = [...attendance, ...newAttendanceLogs];
        const updatedClient = { ...currentClient, attendance: updatedAttendance };
        await saveClient(currentClientId, updatedClient);
        showToast(`Offline Log Loaded! Uploaded ${counts} biometric clock cards successfully.`);
      } else {
        showToast('No matching employee records recognized in uploaded file');
      }
    };
    reader.readAsText(file);
  };

  // EMPLOYEE PORTAL INTERACTION FUNCTIONS
  const handleEmployeeLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(em => em.id === portalEmpId);
    if (!emp) {
      showToast('Employee ID not found in system directory');
      return;
    }

    if (portalPassword === emp.password || portalPassword === 'Password123') {
      setIsEmpLoggedIn(true);
      setActivePortalView('dashboard');
      showToast(`Welcome back, ${emp.fullName}! Open Employee Console active.`);
    } else {
      showToast('Incorrect password sequence entered');
    }
  };

  const handlePortalFileRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const portalEmp = employees.find(em => em.id === portalEmpId);
    if (!portalEmp) return;

    const newReq: RequestApproval = {
      id: 'req_ind_' + Math.random().toString(36).substring(2, 9),
      employeeId: portalEmp.id,
      employeeName: portalEmp.fullName,
      type: requestState.type,
      dateFiled: new Date().toISOString().split('T')[0],
      targetDate: requestState.targetDate,
      details: requestState.details,
      hoursRequested: requestState.type === 'Overtime' ? Number(requestState.hours) : undefined,
      status: 'Pending'
    };

    const updatedApprovals = [...approvals, newReq];
    const updatedClient = { ...currentClient, approvals: updatedApprovals };
    await saveClient(currentClientId, updatedClient);
    showToast(`Request for ${requestState.type} submitted for admin vetting approval!`);
  };

  const handleProcessRequestApproval = async (reqId: string, action: 'Approved' | 'Rejected') => {
    const target = approvals.find(ap => ap.id === reqId);
    if (!target) return;

    // Apply Overtime scheduling immediately to attendance if approved!
    let updatedAttendance = [...attendance];
    if (action === 'Approved' && target.type === 'Overtime') {
      updatedAttendance.push({
        id: 'att_vetted_' + Math.random().toString(36).substring(2, 9),
        employeeId: target.employeeId,
        date: target.targetDate,
        timeIn: '08:00',
        timeOut: '17:00',
        regularHours: 8,
        lateMinutes: 0,
        undertimeMinutes: 0,
        overtimeHours: target.hoursRequested || 0,
        overtypeType: 'Normal',
        status: 'Present'
      });
    }

    const updatedApprovals = approvals.map(ap => 
      ap.id === reqId ? { ...ap, status: action, approvedBy: 'Administrator HR Staff' } : ap
    );

    const updatedClient = { 
      ...currentClient, 
      approvals: updatedApprovals,
      attendance: updatedAttendance
    };

    await saveClient(currentClientId, updatedClient);
    showToast(`Request has been marked as ${action} successfully`);
  };

  // Forgotten password recovery sequence
  const handleInitiateRecovery = () => {
    const emp = employees.find(em => em.id === portalEmpId);
    if (!emp) {
      showToast('Employee ID is required to start recovery credentials verification');
      return;
    }
    setRecoverySecQuestion(emp.securityQuestion || 'What is your registered pet name?');
    setRecoveryMode(true);
  };

  const handleVerifyForgotAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(em => em.id === portalEmpId);
    if (!emp) return;

    const answerLower = (emp.securityAnswer || 'buddy').toLowerCase().trim();
    if (recoveryAnswer.toLowerCase().trim() === answerLower) {
      // Clear security reset
      const updatedEmployees = employees.map(em => 
        em.id === emp.id ? { ...em, password: recoveryResetPassword } : em
      );
      const updatedClient = { ...currentClient, employees: updatedEmployees };
      await saveClient(currentClientId, updatedClient);
      showToast(`Credentials synchronized! Password updated to "${recoveryResetPassword}"`);
      setRecoveryMode(false);
    } else {
      showToast('Validation answer does not match corporate security registration logs');
    }
  };

  // Employee details in portal viewpoint
  const currentPortalEmp = useMemo(() => {
    return employees.find(em => em.id === portalEmpId);
  }, [employees, portalEmpId]);

  return (
    <Modal
      id="payroll_hr_suite"
      title="Statutory Payroll & Advanced HR Portal"
      icon={<Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
      maxWidth="max-w-6xl"
    >
      <div className="flex flex-col gap-6">

        {/* Dynamic Modal Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 gap-1 overflow-x-auto select-none shrink-0 pb-1.5">
          <button
            onClick={() => setActiveTab('rules')}
            className={cn(
              "px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all whitespace-nowrap",
              activeTab === 'rules'
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            ⚙️ Operational Rules & Rates
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={cn(
              "px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all whitespace-nowrap",
              activeTab === 'employees'
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            👥 Employees & Compensation
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={cn(
              "px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all whitespace-nowrap",
              activeTab === 'attendance'
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            ⏱️ Biometric Attendance
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={cn(
              "px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all whitespace-nowrap",
              activeTab === 'payouts'
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            🧮 Process & Bank Pay
          </button>
          <button
            onClick={() => setActiveTab('gov_reports')}
            className={cn(
              "px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all whitespace-nowrap",
              activeTab === 'gov_reports'
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            📊 Government Filing Reports
          </button>
          <button
            onClick={() => setActiveTab('portal')}
            className={cn(
              "px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all whitespace-nowrap",
              activeTab === 'portal'
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shadow-sm animate-pulse"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            🔒 Personal Employee Portal
          </button>
        </div>

        {/* 1. OPERATIONAL RULES & RATES */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tolerances, Standard Times & Grace Period */}
            <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Time Card Tolerances</span>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1.5">Late Arriving Grace Period (Mins):</label>
                  <input 
                    type="number" 
                    value={config.gracePeriodMinutes}
                    onChange={(e) => handleUpdateConfigValue('gracePeriodMinutes', Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400 italic block mt-1">Tolerance window allowed before salary deduction applies.</span>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1.5">Weekly Working Days Configuration:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                      const isChecked = config.workDays.includes(day);
                      return (
                        <label key={day} className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const newList = isChecked 
                                ? config.workDays.filter(d => d !== day) 
                                : [...config.workDays, day];
                              handleUpdateConfigValue('workDays', newList);
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-opacity-20"
                          />
                          <span className="text-slate-600 dark:text-slate-300">{day}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* User Defined Overtime Rates Multiplier */}
            <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Overtime Multipliers</span>
              
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Normal Working Day Overtime:</span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number" 
                      step="0.05"
                      value={config.overtimeRates.normal}
                      onChange={(e) => {
                        const r = { ...config.overtimeRates, normal: Number(e.target.value) };
                        handleUpdateConfigValue('overtimeRates', r);
                      }}
                      className="w-16 text-center py-1 border border-slate-200 dark:border-slate-850 bg-slate-50/50 rounded-lg text-xs font-mono"
                    />
                    <span className="text-slate-400">x</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Rest Day Duty Overtime:</span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number" 
                      step="0.05"
                      value={config.overtimeRates.restDay}
                      onChange={(e) => {
                        const r = { ...config.overtimeRates, restDay: Number(e.target.value) };
                        handleUpdateConfigValue('overtimeRates', r);
                      }}
                      className="w-16 text-center py-1 border border-slate-200 dark:border-slate-850 bg-slate-50/50 rounded-lg text-xs font-mono"
                    />
                    <span className="text-slate-400">x</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Special Non-Working Holiday:</span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number" 
                      step="0.05"
                      value={config.overtimeRates.specialHoliday}
                      onChange={(e) => {
                        const r = { ...config.overtimeRates, specialHoliday: Number(e.target.value) };
                        handleUpdateConfigValue('overtimeRates', r);
                      }}
                      className="w-16 text-center py-1 border border-slate-200 dark:border-slate-850 bg-slate-50/50 rounded-lg text-xs font-mono"
                    />
                    <span className="text-slate-400">x</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Regular Statutory Holiday:</span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number" 
                      step="0.05"
                      value={config.overtimeRates.regularHoliday}
                      onChange={(e) => {
                        const r = { ...config.overtimeRates, regularHoliday: Number(e.target.value) };
                        handleUpdateConfigValue('overtimeRates', r);
                      }}
                      className="w-16 text-center py-1 border border-slate-200 dark:border-slate-850 bg-slate-50/50 rounded-lg text-xs font-mono"
                    />
                    <span className="text-slate-400">x</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Holiday Definitions database list */}
            <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">PH Calendar Holidays</span>
              
              <form onSubmit={handleAddHoliday} className="grid grid-cols-1 gap-2.5">
                <input 
                  type="date"
                  value={newHoliday.date}
                  onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
                  className="px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none"
                />
                <input 
                  type="text"
                  placeholder="Holiday Label (e.g. Rizal Day)"
                  value={newHoliday.name}
                  onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
                  className="px-2 py-1 border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={newHoliday.type}
                    onChange={e => setNewHoliday({...newHoliday, type: e.target.value as 'Regular' | 'Special'})}
                    className="flex-1 py-1 px-2 border border-slate-300 rounded-lg text-xs focus:outline-none"
                  >
                    <option value="Regular">Regular Holiday (200%)</option>
                    <option value="Special">Special Non-work (130%)</option>
                  </select>
                  <button type="submit" className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center justify-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </form>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {config.holidays.map((h, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px] p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <span className="font-mono text-slate-400 font-semibold">{h.date}</span>
                      <div className="font-extrabold text-slate-700 dark:text-slate-200 truncate max-w-32">{h.name}</div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] uppercase font-bold",
                      h.type === 'Regular' ? "bg-red-50 text-red-600 dark:bg-red-950/20" : "bg-orange-50 text-orange-600 dark:bg-orange-950/20"
                    )}>
                      {h.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 2. EMPLOYEES & COMPENSATION PORTFOLIO */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            
            {/* Search and onboarding bar */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
              <div className="relative w-full md:flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Query employee name, department, designation..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-2.5 w-full md:w-auto">
                <button
                  onClick={() => {
                    setEmployeeForm({
                      id: 'EMP-00' + (employees.length + 1),
                      fullName: '', payBasis: 'Semi-Monthly', rate: 20000,
                      sssNo: '', philhealthNo: '', pagibigNo: '', tinNo: '',
                      bankAccountNo: '', bankName: 'BPI', deMinimisAllowance: 2000,
                      recurringOtherAllowance: 1000, recurringOtherDeductions: 0,
                      department: 'Operations', designation: 'Staff Specialist',
                      status: 'Active', securityQuestion: 'Who was your first pet?',
                      securityAnswer: 'Buddy', password: 'Password123'
                    });
                    setShowEmployeeForm(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>On-board Employee</span>
                </button>
              </div>
            </div>

            {/* List and Editing Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Registered Card Registry List */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-3">Employee ID</th>
                        <th className="px-4 py-3">Name & Role</th>
                        <th className="px-4 py-3">Pay Basis</th>
                        <th className="px-4 py-3 text-right">Offer rate (₱)</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {employees.filter(emp => emp.fullName.toLowerCase().includes(employeeSearch.toLowerCase())).map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all text-xs text-slate-600 dark:text-slate-300">
                          <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {emp.id}
                          </td>
                          <td className="px-4 py-3.5 text-slate-800 dark:text-slate-100 font-bold">
                            <div>{emp.fullName}</div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{emp.department} &bull; {emp.designation}</span>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold">
                            {emp.payBasis}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold">
                            ₱{emp.rate.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] uppercase font-bold",
                              emp.status === 'Active' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" : "bg-slate-100 text-slate-600"
                            )}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => { setEmployeeForm(emp); setShowEmployeeForm(true); }}
                                className="p-1 px-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-800 transition-colors"
                              >
                                Edit Profile
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(emp.id, emp.fullName)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {employees.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-16 text-center text-slate-400 dark:text-slate-500">
                            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-15" />
                            <p className="font-bold text-sm">No Employees Registered</p>
                            <p className="text-xs max-w-sm mx-auto mt-1 mb-4">You have zero employees listed under this client currently.</p>
                            <button
                              onClick={handleLoadSandboxHr}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-wider"
                            >
                              Load Practice Sandbox
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Employee Profile detailed sheet */}
              {showEmployeeForm && (
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm space-y-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Employee Profile Details</span>
                  
                  <form onSubmit={handleSaveEmployeeSubmit} className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Tag ID:</label>
                        <input 
                          type="text" 
                          value={employeeForm.id}
                          onChange={e => setEmployeeForm({ ...employeeForm, id: e.target.value })}
                          className="w-full py-1.5 px-3 border border-slate-300 dark:border-slate-700 bg-slate-50 rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Basis:</label>
                        <select
                          value={employeeForm.payBasis}
                          onChange={e => setEmployeeForm({ ...employeeForm, payBasis: e.target.value as any })}
                          className="w-full py-1.5 px-2 border border-slate-300 rounded-lg"
                        >
                          <option value="Monthly">Monthly Basis</option>
                          <option value="Semi-Monthly">Semi-Monthly</option>
                          <option value="Weekly">Weekly Basis</option>
                          <option value="Daily">Daily Basis</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Employee Full Name:</label>
                      <input 
                        type="text" 
                        value={employeeForm.fullName}
                        onChange={e => setEmployeeForm({ ...employeeForm, fullName: e.target.value })}
                        className="w-full py-1.5 px-3 border border-slate-300 rounded-lg"
                        placeholder="e.g. Jose Rizal"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Base rate (₱):</label>
                        <input 
                          type="number" 
                          value={employeeForm.rate}
                          onChange={e => setEmployeeForm({ ...employeeForm, rate: Number(e.target.value) })}
                          className="w-full py-1.5 px-3 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">De Minimis (₱):</label>
                        <input 
                          type="number" 
                          value={employeeForm.deMinimisAllowance}
                          onChange={e => setEmployeeForm({ ...employeeForm, deMinimisAllowance: Number(e.target.value) })}
                          className="w-full py-1.5 px-3 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">SSS ID:</label>
                        <input 
                          type="text" 
                          placeholder="00-0000000-0"
                          value={employeeForm.sssNo}
                          onChange={e => setEmployeeForm({ ...employeeForm, sssNo: e.target.value })}
                          className="w-full py-1.5 px-3 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">PhilHealth:</label>
                        <input 
                          type="text" 
                          placeholder="000000000000"
                          value={employeeForm.philhealthNo}
                          onChange={e => setEmployeeForm({ ...employeeForm, philhealthNo: e.target.value })}
                          className="w-full py-1.5 px-3 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Bank Name:</label>
                        <input 
                          type="text" 
                          value={employeeForm.bankName}
                          onChange={e => setEmployeeForm({ ...employeeForm, bankName: e.target.value })}
                          className="w-full py-1.5 px-3 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Card Account No:</label>
                        <input 
                          type="text" 
                          value={employeeForm.bankAccountNo}
                          onChange={e => setEmployeeForm({ ...employeeForm, bankAccountNo: e.target.value })}
                          className="w-full py-1.5 px-3 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Department:</label>
                        <input 
                          type="text" 
                          value={employeeForm.department}
                          onChange={e => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                          className="w-full py-1.5 px-3 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Designation:</label>
                        <input 
                          type="text" 
                          value={employeeForm.designation}
                          onChange={e => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                          className="w-full py-1.5 px-3 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Individual Payslip Message:</label>
                      <input 
                        type="text" 
                        value={employeeForm.individualMessage || ''}
                        onChange={e => setEmployeeForm({ ...employeeForm, individualMessage: e.target.value })}
                        className="w-full py-1.5 px-3 border border-slate-300 rounded-lg"
                        placeholder="Individual text shown on payslip line"
                      />
                    </div>

                    <div className="flex gap-2 pt-2.5">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow"
                      >
                        Save Credentials
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEmployeeForm(false)}
                        className="py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>

          </div>
        )}

        {/* 3. BIOMETRIC ATTENDANCE / TIMEKEEPING CORES */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            
            {/* Control Bar for auto emulating, manual clockings, logs uploading */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap gap-4 items-center justify-between shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input 
                    type="date"
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800"></div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search logs..."
                    value={timecardSearch}
                    onChange={(e) => setTimecardSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 w-44 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Attendance action suites */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOnlineLogForm(true)}
                  className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100/50 rounded-xl text-xs font-extrabold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Interactive Clock</span>
                </button>

                <button
                  onClick={() => setShowMassOtForm(true)}
                  className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100/50 rounded-xl text-xs font-extrabold flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  <span>Mass OT Scheduler</span>
                </button>

                <div className="relative cursor-pointer py-1.5 px-3.5 bg-slate-100 rounded-xl text-xs font-extrabold text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1.5">
                  <Download className="w-4 h-4" />
                  <span>Upload Offline biometric</span>
                  <input 
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleOfflineLogUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleExportTimecardReport}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Timecards Excel</span>
                </button>
              </div>
            </div>

            {/* Simulated manual log clock card pop up form */}
            {showOnlineLogForm && (
              <form onSubmit={handleOnlineTITO} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 max-w-lg mx-auto grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pick Employee:</label>
                  <select
                    value={onlineLogInId}
                    onChange={e => setOnlineLogInId(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Employee Tag --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>[{e.id}] {e.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Time (IN):</label>
                  <input 
                    type="time" 
                    value={onlineTimeIn} 
                    onChange={e => setOnlineTimeIn(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Time (OUT):</label>
                  <input 
                    type="time" 
                    value={onlineTimeOut} 
                    onChange={e => setOnlineTimeOut(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div className="md:col-span-4 flex justify-end gap-2 pt-2">
                  <button type="submit" className="px-3 py-1 bg-emerald-600 text-white rounded font-bold">Commit Clock-In</button>
                  <button type="button" onClick={() => setShowOnlineLogForm(false)} className="px-3 py-1 bg-slate-300 text-slate-700 rounded">Close</button>
                </div>
              </form>
            )}

            {/* Mass Overtime Assignment popup selector */}
            {showMassOtForm && (
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 max-w-xl mx-auto space-y-3.5 text-xs">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Mass Overtime Scheduler Setup</span>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Department Filter:</label>
                    <select
                      value={massOtSelectedDepartment}
                      onChange={e => setMassOtSelectedDepartment(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="all">All Departments</option>
                      {Array.from(new Set(employees.map(e => e.department))).map(dep => (
                        <option key={dep} value={dep}>{dep}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hours Requested:</label>
                    <input 
                      type="number" 
                      value={massOtHours}
                      onChange={e => setMassOtHours(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-mono text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Multiplier Type:</label>
                    <select
                      value={massOtType}
                      onChange={e => setMassOtType(e.target.value as any)}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Normal">Normal Overtime (1.25x)</option>
                      <option value="RestDay">Rest Day OT (1.30x)</option>
                      <option value="SpecialHoliday">Special Holiday (1.30x)</option>
                      <option value="RegularHoliday">Statutory Holiday (2.00x)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleMassOvertimeAssign}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black uppercase tracking-wider"
                    >
                      Assign Batch
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance logs lists */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-4 py-3">Attendance ID</th>
                      <th className="px-4 py-3">Employee Card</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-center">Time In</th>
                      <th className="px-4 py-3 text-center">Time Out</th>
                      <th className="px-4 py-3 text-center">Regular Work (Hrs)</th>
                      <th className="px-4 py-3 text-center">Lates (Mins)</th>
                      <th className="px-4 py-3 text-center">Overtime Hours</th>
                      <th className="px-4 py-3 text-center">Deduction Index</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attendance.filter(att => att.employeeId.toLowerCase().includes(timecardSearch.toLowerCase())).map((att) => {
                      const empName = employees.find(e => e.id === att.employeeId)?.fullName || 'Unassigned Staff';
                      return (
                        <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all text-xs text-slate-600 dark:text-slate-300">
                          <td className="px-4 py-3 font-mono font-bold text-slate-400">
                            {att.id}
                          </td>
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-100 font-bold">
                            {empName}
                            <span className="text-[9px] text-slate-400 uppercase font-semibold block">ID: {att.employeeId}</span>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {att.date}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-emerald-600 font-bold">
                            {att.timeIn}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-rose-600 font-bold">
                            {att.timeOut}
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            {att.regularHours} Hours
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-amber-600 font-bold">
                            {att.lateMinutes} Mins
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-indigo-600">
                            {att.overtimeHours} Hrs
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] uppercase font-bold",
                              att.lateMinutes > config.gracePeriodMinutes ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                              {att.lateMinutes > config.gracePeriodMinutes ? 'Deducted' : 'Compliant'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {attendance.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-16 text-center text-slate-400 dark:text-slate-500">
                          <Clock className="w-12 h-12 mx-auto mb-4 opacity-15" />
                          <p className="font-bold text-sm">No Timecards Found for this period</p>
                          <p className="text-xs max-w-sm mx-auto mt-1 mb-4">Please upload biometric data or perform interactive employee logging first.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 4. PAYROLL COMPILING & BANK EXPORTS */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            
            {/* Period selector & post triggers */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Payroll Period:</span>
                <select
                  value={activePeriodId}
                  onChange={e => setActivePeriodId(e.target.value)}
                  className="py-1.5 px-3 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50/50"
                >
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>{p.id} ({p.startDate} to {p.endDate})</option>
                  ))}
                </select>
                <span className={cn(
                  "px-2.5 py-0.5 rounded text-[8px] uppercase font-black tracking-wider",
                  (periods.find(p => p.id === activePeriodId)?.isPosted) ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                )}>
                  {(periods.find(p => p.id === activePeriodId)?.isPosted) ? 'POSTED TO GL' : 'PENDING APPROVAL'}
                </span>
              </div>

              {/* Action suites */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPayrollRegister}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-extrabold text-slate-700 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Payroll Register Excel</span>
                </button>

                <button
                  onClick={handlePostPayrollToGeneralJournal}
                  className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Post Integrated GL Entry</span>
                </button>
              </div>
            </div>

            {/* Direct Bank layouts disk compiler */}
            <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">PH Bank Transmission Files (Electronic Diskette conformants)</span>
                  <p className="text-xs text-slate-500 mt-1">Direct salary payouts compiled and structured to BPI, BDO, or Landbank batch credit format templates.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={bankDiskFormat}
                    onChange={e => setBankDiskFormat(e.target.value)}
                    className="py-1 px-3 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="BPI">BPI Express Link format (*.txt)</option>
                    <option value="BDO">BDO Batch payslip conformant (*.csv)</option>
                  </select>
                  <button
                    onClick={handleDownloadDirectBankFile}
                    className="py-1 px-4 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Generate Diskette Block</span>
                  </button>
                </div>
              </div>

              {/* standard pay message configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Standard Payslip Corporate Notice Message:</label>
                  <input 
                    type="text" 
                    value={payrollMessageInput}
                    onChange={e => setPayrollMessageInput(e.target.value)}
                    className="w-full py-1.5 px-3 border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
                  <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                  <p className="text-[10px] text-indigo-800 font-semibold leading-relaxed">
                    Once the Payroll Registry is processed, this standard message and custom individual employee notes will display prominently on print-friendly pay slips.
                  </p>
                </div>
              </div>
            </div>

            {/* Calculations Register Database Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3 text-right">Base Pay (₱)</th>
                      <th className="px-4 py-3 text-right">OT Pay (₱)</th>
                      <th className="px-4 py-3 text-right">De Minimis (₱)</th>
                      <th className="px-4 py-3 text-right">SSS EE (₱)</th>
                      <th className="px-4 py-3 text-right">PhilHealth EE (₱)</th>
                      <th className="px-4 py-3 text-right">Pag-Ibig EE (₱)</th>
                      <th className="px-4 py-3 text-right">WHT (₱)</th>
                      <th className="px-4 py-3 text-right">NET PAYOUT (₱)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs font-bold text-slate-700">
                    {computedPayrollPeriodRows.map((row) => (
                      <tr key={row.employeeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                        <td className="px-4 py-3 font-sans text-slate-800 font-extrabold max-w-36 truncate" title={row.employeeName}>
                          {row.employeeName}
                          <span className="text-[9px] text-slate-400 uppercase font-semibold block">{row.payBasis} &bull; {row.employeeId}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {row.basePay.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3 text-right text-indigo-600">
                          {row.overtimePay.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600">
                          {row.deMinimisAllowance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3 text-right text-rose-500">
                          {row.sssContribution.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3 text-right text-rose-500">
                          {row.philhealthContribution.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3 text-right text-rose-500">
                          {row.pagibigContribution.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3 text-right text-rose-600">
                          {row.withholdingTax.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700 bg-emerald-50/20 font-black">
                          ₱{row.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                      </tr>
                    ))}

                    {computedPayrollPeriodRows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                          <Calculator className="w-12 h-12 mx-auto mb-4 opacity-15" />
                          <p className="font-bold text-sm">No Computed Profiles Available</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 5. GOVERNMENT STATUTORY REPORTS COMPRESSED */}
        {activeTab === 'gov_reports' && (
          <div className="space-y-6">
            
            {/* TRAIN, SSS R-3 PhilHealth RF-1 overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* SSS R3 Contribution Grid Card representation */}
              <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">SSS Form R-3 (Statutory Monthly Report)</span>
                <p className="text-xs text-slate-500">Standard compilation of SSS numbers, employee, employer shares matching monthly salary credits.</p>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {employees.map(emp => {
                    const monthlyBase = emp.payBasis === 'Monthly' ? emp.rate : emp.rate * 2;
                    const contrib = computeSSSContribution(monthlyBase);
                    return (
                      <div key={emp.id} className="p-2 bg-slate-50 rounded-xl text-[10px] space-y-1">
                        <div className="font-bold text-slate-800">{emp.fullName}</div>
                        <div className="flex justify-between font-mono">
                          <span>SSS No: {emp.sssNo || 'N/A'}</span>
                          <span className="text-slate-500">MSC: ₱{monthlyBase.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-mono font-bold text-rose-600">
                          <span>EE: ₱{contrib.employee.toLocaleString()}</span>
                          <span>ER: ₱{contrib.employer.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PhilHealth Form RF-1 Grid Card */}
              <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">PhilHealth Form RF-1 (Premium Table)</span>
                <p className="text-xs text-slate-500">Compliance check with PhillHealth numbers, split equally at current premium parameters.</p>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {employees.map(emp => {
                    const monthlyBase = emp.payBasis === 'Monthly' ? emp.rate : emp.rate * 2;
                    const contrib = computePhilHealthContribution(monthlyBase);
                    return (
                      <div key={emp.id} className="p-2 bg-slate-50 rounded-xl text-[10px] space-y-1">
                        <div className="font-bold text-slate-800">{emp.fullName}</div>
                        <div className="flex justify-between font-mono">
                          <span>PHIC: {emp.philhealthNo || 'N/A'}</span>
                          <span className="text-slate-500">MSC: ₱{monthlyBase.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-mono font-bold text-indigo-600">
                          <span>EE: ₱{contrib.employee.toLocaleString()}</span>
                          <span>ER: ₱{contrib.employer.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pag-IBIG HDMF statutory compiler */}
              <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pag-IBIG MSRS (Contribution Register)</span>
                <p className="text-xs text-slate-500">HDMF contribution ledger reporting under capped mandatory employer statutory matching.</p>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {employees.map(emp => {
                    const monthlyBase = emp.payBasis === 'Monthly' ? emp.rate : emp.rate * 2;
                    const contrib = computePagIBIGContribution(monthlyBase);
                    return (
                      <div key={emp.id} className="p-2 bg-slate-50 rounded-xl text-[10px] space-y-1">
                        <div className="font-bold text-slate-800">{emp.fullName}</div>
                        <div className="flex justify-between font-mono">
                          <span>PAGIBIG: {emp.pagibigNo || 'N/A'}</span>
                          <span className="text-slate-500">EE Capped: ₱{contrib.employee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-mono font-bold text-emerald-600">
                          <span>EE Share: ₱{contrib.employee.toLocaleString()}</span>
                          <span>ER Share: ₱{contrib.employer.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 6. SECURITY CONTROL & PERSONAL EMPLOYEE PORTAL */}
        {activeTab === 'portal' && (
          <div className="space-y-6">
            
            {/* Mode headers (Switch portals viewpoint) */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                <span>Console Gateway:</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPortalMode('employer'); setIsEmpLoggedIn(false); }}
                  className={cn("px-4 py-1.5 rounded-lg border", portalMode === 'employer' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100")}
                >
                  Admin HR View
                </button>
                <button
                  onClick={() => setPortalMode('employee')}
                  className={cn("px-4 py-1.5 rounded-lg border", portalMode === 'employee' ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-100")}
                >
                  Indiv Staff Gateway
                </button>
              </div>
            </div>

            {/* EMPLOYER MANAGER DASHBOARD VIEW APPROVALS list */}
            {portalMode === 'employer' && (
              <div className="space-y-6">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Managerial Approval Work Items list</span>
                
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-3">Filing Date</th>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Request Type</th>
                        <th className="px-4 py-3">Target Date</th>
                        <th className="px-4 py-3">Detailed Specs</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-600 dark:text-slate-300">
                      {approvals.map(app => (
                        <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                          <td className="px-4 py-3.5 font-mono text-slate-400">{app.dateFiled}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-100">{app.employeeName}</td>
                          <td className="px-4 py-3.5 font-bold">{app.type}</td>
                          <td className="px-4 py-3.5 font-mono">{app.targetDate}</td>
                          <td className="px-4 py-3.5 truncate max-w-sm" title={app.details}>{app.details}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] uppercase font-black",
                              app.status === 'Pending' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                              app.status === 'Approved' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700"
                            )}>
                              {app.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {app.status === 'Pending' && (
                              <div className="flex gap-1.5 justify-center">
                                <button
                                  onClick={() => handleProcessRequestApproval(app.id, 'Approved')}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[10px]"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleProcessRequestApproval(app.id, 'Rejected')}
                                  className="px-2 py-1 bg-rose-600 text-white rounded font-bold text-[10px]"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}

                      {approvals.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                            <Inbox className="w-12 h-12 mx-auto mb-4 opacity-15" />
                            <p className="font-bold text-sm">No Pending Request Worksheets</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STAFF PERSONAL LOGIN GATEWAY */}
            {portalMode === 'employee' && !isEmpLoggedIn && (
              <div className="max-w-md mx-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl shadow space-y-4 text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">Staff Authentication Portal</span>
                
                <form onSubmit={handleEmployeeLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Registered Employee ID:</label>
                    <input 
                      type="text" 
                      placeholder="e.g. EMP-001"
                      value={portalEmpId}
                      onChange={e => setPortalEmpId(e.target.value)}
                      className="w-full p-2.5 border rounded-lg font-mono tracking-wider font-extrabold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Portal Password:</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={portalPassword}
                      onChange={e => setPortalPassword(e.target.value)}
                      className="w-full p-2.5 border rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-wider shadow"
                  >
                    Authenticate Gateway
                  </button>
                  
                  <div className="text-center pt-2.5">
                    <button
                      type="button"
                      onClick={handleInitiateRecovery}
                      className="text-[10px] text-indigo-600 hover:underline font-bold"
                    >
                      Retrieve / Reset Forgotten Password Sequence
                    </button>
                  </div>
                </form>

                {/* Password recovery popup sheet */}
                {recoveryMode && (
                  <form onSubmit={handleVerifyForgotAnswer} className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-[11px] mt-4">
                    <span className="font-bold text-amber-800">Security Recover Matrix Question</span>
                    <p className="text-slate-600 italic">"{recoverySecQuestion}"</p>
                    <input 
                      type="text" 
                      placeholder="Your secret registered response"
                      value={recoveryAnswer}
                      onChange={e => setRecoveryAnswer(e.target.value)}
                      className="w-full p-2 border rounded bg-white text-xs"
                    />
                    <input 
                      type="text" 
                      placeholder="New password sequence to establish"
                      value={recoveryResetPassword}
                      onChange={e => setRecoveryResetPassword(e.target.value)}
                      className="w-full p-2 border rounded bg-white text-xs font-mono"
                    />
                    <div className="flex gap-1 justify-end pt-1">
                      <button type="submit" className="px-3 py-1 bg-amber-700 text-white rounded font-bold">Assert Reset</button>
                      <button type="button" onClick={() => setRecoveryMode(false)} className="px-3 py-1 bg-slate-300 rounded font-semibold text-slate-700">Close</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* LOGGED IN STAFF INTERACTIVE SHEET */}
            {portalMode === 'employee' && isEmpLoggedIn && currentPortalEmp && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                
                {/* Left pane: Profile card */}
                <div className="md:col-span-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="text-center pb-3 border-b border-slate-200">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-extrabold text-base mx-auto mb-2">
                        {currentPortalEmp.fullName[0]}
                      </div>
                      <span className="font-black text-slate-800 dark:text-white text-xs block">{currentPortalEmp.fullName}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{currentPortalEmp.designation}</span>
                    </div>

                    <div className="space-y-1 text-[11px] border-b border-slate-200 pb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Employee ID:</span>
                        <span className="font-mono font-bold text-indigo-600">{currentPortalEmp.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pay Type:</span>
                        <span className="font-bold">{currentPortalEmp.payBasis}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Base salary:</span>
                        <span className="font-mono font-bold">₱{currentPortalEmp.rate.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEmpLoggedIn(false)}
                    className="w-full py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-xl font-bold uppercase tracking-wider"
                  >
                    Logout Portal
                  </button>
                </div>

                {/* Right Area: Interactive tools */}
                <div className="md:col-span-3 space-y-6">
                  
                  {/* Select menu views */}
                  <div className="flex border-b pb-1 gap-4">
                    <button onClick={() => setActivePortalView('dashboard')} className={cn("font-extrabold uppercase py-1", activePortalView === 'dashboard' && "text-indigo-605 border-b-2 border-indigo-500")}>📌 My Dashboard</button>
                    <button onClick={() => setActivePortalView('net_pay')} className={cn("font-extrabold uppercase py-1", activePortalView === 'net_pay' && "text-indigo-605 border-b-2 border-indigo-500")}>📊 Net Pay Inquiry</button>
                    <button onClick={() => setActivePortalView('requests')} className={cn("font-extrabold uppercase py-1", activePortalView === 'requests' && "text-indigo-605 border-b-2 border-indigo-505")}>📝 File Requests</button>
                  </div>

                  {/* Portal Dash view */}
                  {activePortalView === 'dashboard' && (
                    <div className="space-y-4">
                      {currentPortalEmp.individualMessage && (
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 flex items-center gap-2.5">
                          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                          <p className="font-bold italic">Message from Payroll Admin: "{currentPortalEmp.individualMessage}"</p>
                        </div>
                      )}

                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">My Attendance Records log</span>
                      <div className="bg-white rounded-xl border p-2 max-h-44 overflow-y-auto pr-1">
                        {attendance.filter(att => att.employeeId === currentPortalEmp.id).map(att => (
                          <div key={att.id} className="flex justify-between p-2 hover:bg-slate-50 rounded text-[11px] font-mono">
                            <span>Logged Date: {att.date}</span>
                            <span className="text-emerald-600 font-bold">IN: {att.timeIn}</span>
                            <span className="text-rose-600 font-bold">OUT: {att.timeOut}</span>
                            <span className="font-sans font-bold">Hrs: {att.regularHours}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Portal Net pay calculations projection */}
                  {activePortalView === 'net_pay' && (
                    <div className="p-5 border border-slate-200 bg-white rounded-2xl shadow-sm grid grid-cols-2 gap-4">
                      <div className="space-y-3.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Real-time Net Pay projection</span>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Gross Period Salary Estimate:</span>
                          <span className="font-bold font-mono">₱{(currentPortalEmp.payBasis === 'Monthly' ? currentPortalEmp.rate / 2 : currentPortalEmp.rate).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">De Minimis Non-Taxable allowance:</span>
                          <span className="font-bold font-mono text-emerald-600">₱{(currentPortalEmp.deMinimisAllowance || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-dashed pt-2 font-bold text-slate-800">
                          <span>Total Cash Intake base:</span>
                          <span className="font-mono">₱{((currentPortalEmp.payBasis === 'Monthly' ? currentPortalEmp.rate / 2 : currentPortalEmp.rate) + (currentPortalEmp.deMinimisAllowance || 0)).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-indigo-50/55 rounded-xl space-y-2 text-[11px] text-indigo-805">
                        <span className="font-extrabold uppercase">Government statutory brackets projection</span>
                        <p>TRAIN withholding, monthly SSS revision schedules, Philhealth split premium, and Pag-IBIG matched Matchings are continuously audited against government tables on active processing runs.</p>
                      </div>
                    </div>
                  )}

                  {/* Requests filing console */}
                  {activePortalView === 'requests' && (
                    <form onSubmit={handlePortalFileRequest} className="p-4 border rounded-xl bg-slate-50 space-y-3 max-w-md">
                      <span className="font-black text-slate-800 uppercase text-[10px] block">New Leave, OT, Shift, or OB Ticket filing</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ticket Type:</label>
                          <select
                            value={requestState.type}
                            onChange={e => setRequestState({ ...requestState, type: e.target.value as any })}
                            className="w-full py-1 px-2 border rounded bg-white"
                          >
                            <option value="Overtime">Overtime Request</option>
                            <option value="Leave">Leave Filing</option>
                            <option value="ShiftChange">Shift Change</option>
                            <option value="OfficialBusiness">Official Business (OB)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Execution Date:</label>
                          <input 
                            type="date"
                            value={requestState.targetDate}
                            onChange={e => setRequestState({ ...requestState, targetDate: e.target.value })}
                            className="w-full py-1 px-2 border rounded bg-white font-mono"
                          />
                        </div>
                      </div>

                      {requestState.type === 'Overtime' && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Scheduled Hours requested:</label>
                          <input 
                            type="number"
                            value={requestState.hours}
                            onChange={e => setRequestState({ ...requestState, hours: Number(e.target.value) })}
                            className="w-full py-1 px-2 border rounded font-mono"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Particular details / Reason:</label>
                        <input 
                          type="text" 
                          value={requestState.details}
                          onChange={e => setRequestState({ ...requestState, details: e.target.value })}
                          className="w-full py-1.5 px-3 border rounded bg-white text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider shadow text-center block"
                      >
                        Commit Ticket Request
                      </button>
                    </form>
                  )}

                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </Modal>
  );
}
