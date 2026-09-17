"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  isContactPickerSupported,
  pickContact,
} from "@/lib/contacts/pick-contact";

type Student = {
  id: string;
  student_name: string;
  guardian_name: string | null;
  whatsapp_number: string | null;
  monthly_fee: number;
  due_day: number | null;
  notes: string | null;
  is_active: boolean;
};

type Account = {
  id: string;
  name: string;
  currency: string;
};

type TuitionStatus = {
  student_id: string;
  student_name: string;
  monthly_fee: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: "paid" | "partial" | "unpaid";
};

type PaymentHistory = {
  payment_id: string;
  student_id: string;
  transaction_id: string;
  account_id: string;
  payment_month: string;
  amount: number;
  payment_date: string;
  account_name: string | null;
  currency: string | null;
  notes: string | null;
  promised_payment_date: string | null;
  late_reason: string | null;
  days_late: number | null;
};

type TuitionReliability = {
  student_id: string;
  student_name: string;
  total_payments: number;
  on_time_payments: number;
  late_payments: number;
  average_days_late: number;
  reliability_score: number;
  reliability_rating: string;
};

export default function TuitionPage() {
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statuses, setStatuses] = useState<TuitionStatus[]>([]);
  const [reliability, setReliability] = useState<TuitionReliability[]>([]);

  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Add student
  const [studentName, setStudentName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [dueDay, setDueDay] = useState("");

  // Edit student
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Payment
  const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [promisedPaymentDate, setPromisedPaymentDate] = useState("");
  const [lateReason, setLateReason] = useState("");

  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [paymentMonth, setPaymentMonth] = useState(
    new Date().toISOString().slice(0, 7) + "-01"
  );

  // Edit payment
  const [editingPayment, setEditingPayment] =
    useState<PaymentHistory | null>(null);

  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentAccount, setEditPaymentAccount] = useState("");
  const [editPaymentMonth, setEditPaymentMonth] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editPromisedPaymentDate, setEditPromisedPaymentDate] =
    useState("");
  const [editLateReason, setEditLateReason] = useState("");
  const [editPaymentNotes, setEditPaymentNotes] = useState("");

  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  async function loadReliability() {
    const { data, error } = await supabase.rpc(
      "get_tuition_reliability"
    );

    if (error) {
      console.error(error);
      setReliability([]);
      return;
    }

    setReliability(
      (data as TuitionReliability[]) ?? []
    );
  }

  async function loadStatuses(month: string) {
    const { data, error } = await supabase.rpc(
      "get_tuition_monthly_status",
      {
        p_month: month,
      }
    );

    if (error) {
      console.error(error);
      return;
    }

    setStatuses((data as TuitionStatus[]) ?? []);
  }

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStudents([]);
      setAccounts([]);
      setStatuses([]);
      setReliability([]);
      setLoading(false);
      return;
    }

    const [
      { data: studentData, error: studentError },
      { data: accountData, error: accountError },
    ] = await Promise.all([
      supabase
        .from("tuition_students")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),

            supabase
        .from("accounts")
        .select("id,name,currency")
        .eq("user_id", user.id)
        .eq("account_type", "asset")
        .eq("is_archived", false)
        .eq("is_system", false)
        .order("name"),
    ]);

    if (studentError) {
      console.error(studentError);
      setStudents([]);
    } else {
      setStudents((studentData as Student[]) ?? []);
    }

    if (accountError) {
      console.error(accountError);
      setAccounts([]);
    } else {
      setAccounts((accountData as Account[]) ?? []);
    }

    await Promise.all([
      loadStatuses(selectedMonth),
      loadReliability(),
    ]);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  async function addStudent(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    const fee = Number(monthlyFee);
    const due = dueDay ? Number(dueDay) : null;

    if (!Number.isFinite(fee) || fee <= 0) {
      alert("Monthly fee must be greater than zero.");
      return;
    }

    if (
      due !== null &&
      (!Number.isFinite(due) || due < 1 || due > 31)
    ) {
      alert("Due day must be between 1 and 31.");
      return;
    }

    if (!studentName.trim()) {
      alert("Student name is required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "create_tuition_student",
      {
        p_student_name: studentName.trim(),
        p_guardian_name: guardianName.trim() || null,
        p_whatsapp_number: whatsapp.trim() || null,
        p_monthly_fee: fee,
        p_due_day: due,
        p_notes: null,
      }
    );

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setStudentName("");
    setGuardianName("");
    setWhatsapp("");
    setMonthlyFee("");
    setDueDay("");

    await loadData();

    setSaving(false);
  }

  async function updateStudent(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingStudent || saving) return;

    const fee = Number(editingStudent.monthly_fee);

    if (!Number.isFinite(fee) || fee <= 0) {
      alert("Monthly fee must be greater than zero.");
      return;
    }

    if (
      editingStudent.due_day !== null &&
      (!Number.isFinite(editingStudent.due_day) ||
        editingStudent.due_day < 1 ||
        editingStudent.due_day > 31)
    ) {
      alert("Due day must be between 1 and 31.");
      return;
    }

    if (!editingStudent.student_name.trim()) {
      alert("Student name is required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "update_tuition_student",
      {
        p_student_id: editingStudent.id,
        p_student_name: editingStudent.student_name.trim(),
        p_guardian_name:
          editingStudent.guardian_name?.trim() || null,
        p_whatsapp_number:
          editingStudent.whatsapp_number?.trim() || null,
        p_monthly_fee: fee,
        p_due_day: editingStudent.due_day,
        p_notes:
          editingStudent.notes?.trim() || null,
      }
    );

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setEditingStudent(null);

    await loadData();

    setSaving(false);
  }

  async function recordPayment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!paymentStudent || saving) return;

    if (!paymentAccount) {
      alert(
        "Please select the account that received the payment."
      );
      return;
    }

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Payment amount must be greater than zero.");
      return;
    }

    if (!paymentMonth || !paymentDate) {
      alert("Payment month and payment date are required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "record_tuition_payment",
      {
        p_student_id: paymentStudent.id,
        p_payment_month: paymentMonth,
        p_amount: amount,
        p_payment_date: paymentDate,
        p_account_id: paymentAccount,
        p_notes: null,
        p_promised_payment_date:
          promisedPaymentDate || null,
        p_late_reason:
          lateReason || null,
      }
    );

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setPaymentStudent(null);
    setPaymentAmount("");
    setPaymentAccount("");
    setPromisedPaymentDate("");
    setLateReason("");

    await loadData();

    setSaving(false);
  }

  async function loadPaymentHistory(
    student: Student
  ) {
    setHistoryStudent(student);
    setHistoryLoading(true);
    setEditingPayment(null);

    const { data, error } = await supabase.rpc(
      "get_tuition_payment_history",
      {
        p_student_id: student.id,
      }
    );

    if (error) {
      alert(error.message);
      setPaymentHistory([]);
      setHistoryLoading(false);
      return;
    }

    setPaymentHistory(
      (data as PaymentHistory[]) ?? []
    );

    setHistoryLoading(false);
  }

  function openEditPayment(
    payment: PaymentHistory
  ) {
    setEditingPayment(payment);

    setEditPaymentAmount(
      String(payment.amount)
    );

    setEditPaymentAccount(
      payment.account_id
    );

    setEditPaymentMonth(
      payment.payment_month
    );

    setEditPaymentDate(
      payment.payment_date
    );

    setEditPromisedPaymentDate(
      payment.promised_payment_date ?? ""
    );

    setEditLateReason(
      payment.late_reason ?? ""
    );

    setEditPaymentNotes(
      payment.notes ?? ""
    );
  }

  async function editPayment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingPayment || saving) return;

    if (!editPaymentAccount) {
      alert(
        "Please select the account that received the payment."
      );
      return;
    }

    const amount = Number(editPaymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert(
        "Payment amount must be greater than zero."
      );
      return;
    }

    if (!editPaymentMonth || !editPaymentDate) {
      alert(
        "Payment month and payment date are required."
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "update_tuition_payment",
      {
        p_payment_id:
          editingPayment.payment_id,
        p_payment_month:
          editPaymentMonth,
        p_amount:
          amount,
        p_payment_date:
          editPaymentDate,
        p_account_id:
          editPaymentAccount,
        p_notes:
          editPaymentNotes.trim() || null,
        p_promised_payment_date:
          editPromisedPaymentDate || null,
        p_late_reason:
          editLateReason || null,
      }
    );

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setEditingPayment(null);

    if (historyStudent) {
      await loadPaymentHistory(historyStudent);
    }

    await loadData();

    setSaving(false);
  }

  async function cancelPayment(
    payment: PaymentHistory
  ) {
    if (saving) return;

    const confirmed = window.confirm(
      `Cancel this tuition payment of ${
        payment.currency ?? "BDT"
      } ${Number(payment.amount).toLocaleString()}?`
    );

    if (!confirmed) return;

    setSaving(true);

    const { error } = await supabase.rpc(
      "cancel_tuition_payment",
      {
        p_payment_id: payment.payment_id,
      }
    );

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    if (
      editingPayment?.payment_id ===
      payment.payment_id
    ) {
      setEditingPayment(null);
    }

    if (historyStudent) {
      await loadPaymentHistory(historyStudent);
    }

    await loadData();

    setSaving(false);
  }

  async function archiveStudent(id: string) {
    if (archiveLoading) return;

    const confirmed = window.confirm(
      "Archive this tuition student?"
    );

    if (!confirmed) return;

    setArchiveLoading(true);

    const { error } = await supabase.rpc(
      "archive_tuition_student",
      {
        p_student_id: id,
      }
    );

    if (error) {
      alert(error.message);
      setArchiveLoading(false);
      return;
    }

    if (editingStudent?.id === id) {
      setEditingStudent(null);
    }

    if (paymentStudent?.id === id) {
      setPaymentStudent(null);
    }

    if (historyStudent?.id === id) {
      setHistoryStudent(null);
      setPaymentHistory([]);
    }

    await loadData();

    setArchiveLoading(false);
  }

  async function chooseContact() {
    if (!isContactPickerSupported()) {
      alert(
        "Contact selection is not supported by this browser. Please enter the WhatsApp number manually."
      );
      return;
    }

    try {
      setContactLoading(true);

      const contact = await pickContact();

      if (!contact) return;

      if (!contact.phoneNumber) {
        alert(
          "The selected contact does not have a phone number."
        );
        return;
      }

      setWhatsapp(contact.phoneNumber);

      if (!guardianName && contact.name) {
        setGuardianName(contact.name);
      }
    } catch (error) {
      console.error(error);

      alert(
        "Unable to access your contacts. You can enter the WhatsApp number manually."
      );
    } finally {
      setContactLoading(false);
    }
  }

  async function chooseContactForEdit() {
    if (!isContactPickerSupported()) {
      alert(
        "Contact selection is not supported by this browser. Please enter the WhatsApp number manually."
      );
      return;
    }

    if (!editingStudent) return;

    try {
      setContactLoading(true);

      const contact = await pickContact();

      if (!contact) return;

      if (!contact.phoneNumber) {
        alert(
          "The selected contact does not have a phone number."
        );
        return;
      }

      setEditingStudent({
        ...editingStudent,
        whatsapp_number:
          contact.phoneNumber,
        guardian_name:
          editingStudent.guardian_name ??
          contact.name ??
          null,
      });
    } catch (error) {
      console.error(error);

      alert(
        "Unable to access your contacts. You can enter the WhatsApp number manually."
      );
    } finally {
      setContactLoading(false);
    }
  }

  function openWhatsApp(
    student: Student,
    status: TuitionStatus | undefined,
    type: "reminder" | "received"
  ) {
    if (!student.whatsapp_number) {
      alert(
        "No WhatsApp number saved for this student."
      );
      return;
    }

    const paid = Number(
      status?.paid_amount ?? 0
    );

    const remaining = Number(
      status?.remaining_amount ??
        student.monthly_fee
    );

    const message =
      type === "reminder"
        ? `Hello, this is a reminder regarding ${student.student_name}'s tuition fee for this month.\n\n` +
          `Monthly fee: BDT ${student.monthly_fee.toLocaleString()}\n` +
          `Paid: BDT ${paid.toLocaleString()}\n` +
          `Remaining: BDT ${remaining.toLocaleString()}\n\n` +
          `Please let me know once the payment has been made. Thank you.`
        : `Hello, this is to confirm the tuition payment for ${student.student_name}.\n\n` +
          `Monthly fee: BDT ${student.monthly_fee.toLocaleString()}\n` +
          `Paid: BDT ${paid.toLocaleString()}\n` +
          `Remaining: BDT ${remaining.toLocaleString()}\n\n` +
          `Thank you for the payment.`;

    let phone =
      student.whatsapp_number.replace(/\D/g, "");

    if (phone.startsWith("0")) {
      phone = "88" + phone;
    }

    if (!phone) {
      alert("The saved WhatsApp number is invalid.");
      return;
    }

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(
        message
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function getStatus(studentId: string) {
    return statuses.find(
      (status) =>
        status.student_id === studentId
    );
  }

  function statusLabel(
    status: TuitionStatus["payment_status"]
  ) {
    if (status === "paid") return "Paid";
    if (status === "partial") return "Partial";
    return "Unpaid";
  }

  function reliabilityBadgeClass(
    rating: string
  ) {
    if (
      rating === "Excellent" ||
      rating === "Reliable"
    ) {
      return "badge-success";
    }

    if (rating === "Sometimes late") {
      return "badge-warning";
    }

    return "badge-danger";
  }

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <h1>Tuition</h1>
          <p>
            Manage your private tuition students and payments.
          </p>
        </div>
      </div>

      {/* MONTHLY OVERVIEW */}

      <div className="card">
        <h2>Monthly Overview</h2>

        <div className="form-group">
          <label htmlFor="tuition-month">
            Month
          </label>

          <input
            id="tuition-month"
            type="month"
            value={selectedMonth.slice(0, 7)}
            onChange={(e) => {
              const month =
                `${e.target.value}-01`;

              setSelectedMonth(month);
              setPaymentMonth(month);
            }}
          />
        </div>

        <div className="grid-3">
          <div>
            <strong>
              {
                statuses.filter(
                  (s) =>
                    s.payment_status === "paid"
                ).length
              }
            </strong>
            <p>Paid</p>
          </div>

          <div>
            <strong>
              {
                statuses.filter(
                  (s) =>
                    s.payment_status === "partial"
                ).length
              }
            </strong>
            <p>Partial</p>
          </div>

          <div>
            <strong>
              {
                statuses.filter(
                  (s) =>
                    s.payment_status === "unpaid"
                ).length
              }
            </strong>
            <p>Unpaid</p>
          </div>
        </div>
      </div>

      {/* ADD STUDENT */}

      <div className="card">
        <h2>Add Tuition Student</h2>

        <form onSubmit={addStudent}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="student-name">
                Student Name
              </label>

              <input
                id="student-name"
                value={studentName}
                onChange={(e) =>
                  setStudentName(e.target.value)
                }
                placeholder="Student name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="guardian-name">
                Guardian Name
              </label>

              <input
                id="guardian-name"
                value={guardianName}
                onChange={(e) =>
                  setGuardianName(e.target.value)
                }
                placeholder="Parent / guardian"
              />
            </div>

            <div className="form-group">
              <label htmlFor="whatsapp-number">
                WhatsApp Number
              </label>

              <input
                id="whatsapp-number"
                value={whatsapp}
                onChange={(e) =>
                  setWhatsapp(e.target.value)
                }
                placeholder="8801XXXXXXXXX"
                inputMode="tel"
              />

              {isContactPickerSupported() && (
                <button
                  type="button"
                  onClick={chooseContact}
                  disabled={contactLoading}
                  style={{ marginTop: 8 }}
                >
                  {contactLoading
                    ? "Selecting..."
                    : "Choose from Contacts"}
                </button>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="monthly-fee">
                Monthly Fee
              </label>

              <input
                id="monthly-fee"
                type="number"
                min="0.01"
                step="0.01"
                value={monthlyFee}
                onChange={(e) =>
                  setMonthlyFee(e.target.value)
                }
                placeholder="3000"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="due-day">
                Due Day
              </label>

              <input
                id="due-day"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) =>
                  setDueDay(e.target.value)
                }
                placeholder="10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
          >
            {saving ? "Adding..." : "Add Student"}
          </button>
        </form>
      </div>

      {/* EDIT STUDENT */}

      {editingStudent && (
        <div className="card">
          <div className="section-header">
            <div>
              <h2>Edit Student</h2>
              <p>
                Update tuition student information.
              </p>
            </div>
          </div>

          <form onSubmit={updateStudent}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="edit-student-name">
                  Student Name
                </label>

                <input
                  id="edit-student-name"
                  value={editingStudent.student_name}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      student_name:
                        e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-guardian-name">
                  Guardian Name
                </label>

                <input
                  id="edit-guardian-name"
                  value={
                    editingStudent.guardian_name ??
                    ""
                  }
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      guardian_name:
                        e.target.value || null,
                    })
                  }
                  placeholder="Parent / guardian"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-whatsapp">
                  WhatsApp Number
                </label>

                <input
                  id="edit-whatsapp"
                  value={
                    editingStudent.whatsapp_number ??
                    ""
                  }
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      whatsapp_number:
                        e.target.value || null,
                    })
                  }
                  placeholder="8801XXXXXXXXX"
                  inputMode="tel"
                />

                {isContactPickerSupported() && (
                  <button
                    type="button"
                    onClick={
                      chooseContactForEdit
                    }
                    disabled={contactLoading}
                    style={{ marginTop: 8 }}
                  >
                    {contactLoading
                      ? "Selecting..."
                      : "Choose from Contacts"}
                  </button>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="edit-monthly-fee">
                  Monthly Fee
                </label>

                <input
                  id="edit-monthly-fee"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    editingStudent.monthly_fee
                  }
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      monthly_fee:
                        Number(e.target.value),
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-due-day">
                  Due Day
                </label>

                <input
                  id="edit-due-day"
                  type="number"
                  min="1"
                  max="31"
                  value={
                    editingStudent.due_day ?? ""
                  }
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      due_day: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  placeholder="10"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-notes">
                  Notes
                </label>

                <input
                  id="edit-notes"
                  value={
                    editingStudent.notes ?? ""
                  }
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      notes:
                        e.target.value || null,
                    })
                  }
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="action-buttons tuition-actions">
              <button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setEditingStudent(null)
                }
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RECORD PAYMENT */}

      {paymentStudent && (
        <div className="card">
          <div className="section-header">
            <div>
              <h2>Record Tuition Payment</h2>
              <p>
                {paymentStudent.student_name}
              </p>
            </div>
          </div>

          <form onSubmit={recordPayment}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="payment-amount">
                  Payment Amount
                </label>

                <input
                  id="payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="payment-month">
                  Payment Month
                </label>

                <input
                  id="payment-month"
                  type="date"
                  value={paymentMonth}
                  onChange={(e) =>
                    setPaymentMonth(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="payment-date">
                  Payment Date
                </label>

                <input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) =>
                    setPaymentDate(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="promised-payment-date">
                  Promised Payment Date (Optional)
                </label>

                <input
                  id="promised-payment-date"
                  type="date"
                  value={promisedPaymentDate}
                  onChange={(e) =>
                    setPromisedPaymentDate(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="late-reason">
                  Late Reason (Optional)
                </label>

                <select
                  id="late-reason"
                  value={lateReason}
                  onChange={(e) =>
                    setLateReason(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    No reason provided
                  </option>
                  <option value="Forgot">
                    Forgot
                  </option>
                  <option value="Financial difficulty">
                    Financial difficulty
                  </option>
                  <option value="Guardian unavailable">
                    Guardian unavailable
                  </option>
                  <option value="Payment problem">
                    Payment problem
                  </option>
                  <option value="Personal or emergency">
                    Personal or emergency
                  </option>
                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="payment-account">
                  Received Into
                </label>

                <select
                  id="payment-account"
                  value={paymentAccount}
                  onChange={(e) =>
                    setPaymentAccount(
                      e.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select account
                  </option>

                  {accounts.map((account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {account.name} (
                      {account.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="action-buttons">
              <button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Record Payment"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setPaymentStudent(null)
                }
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAYMENT HISTORY */}

      {historyStudent && (
        <div className="card">
          <div className="section-header">
            <div>
              <h2>Payment History</h2>
              <p>
                {historyStudent.student_name}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setHistoryStudent(null);
                setPaymentHistory([]);
                setEditingPayment(null);
              }}
              disabled={saving}
            >
              Close
            </button>
          </div>

          {editingPayment && (
            <div className="card">
              <div className="section-header">
                <div>
                  <h2>Edit Tuition Payment</h2>
                  <p>
                    Update the recorded payment details.
                  </p>
                </div>
              </div>

              <form onSubmit={editPayment}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="edit-payment-amount">
                      Payment Amount
                    </label>

                    <input
                      id="edit-payment-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editPaymentAmount}
                      onChange={(e) =>
                        setEditPaymentAmount(
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-payment-month">
                      Payment Month
                    </label>

                    <input
                      id="edit-payment-month"
                      type="date"
                      value={editPaymentMonth}
                      onChange={(e) =>
                        setEditPaymentMonth(
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-payment-date">
                      Payment Date
                    </label>

                    <input
                      id="edit-payment-date"
                      type="date"
                      value={editPaymentDate}
                      onChange={(e) =>
                        setEditPaymentDate(
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-promised-payment-date">
                      Promised Payment Date (Optional)
                    </label>

                    <input
                      id="edit-promised-payment-date"
                      type="date"
                      value={
                        editPromisedPaymentDate
                      }
                      onChange={(e) =>
                        setEditPromisedPaymentDate(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-late-reason">
                      Late Reason (Optional)
                    </label>

                    <select
                      id="edit-late-reason"
                      value={editLateReason}
                      onChange={(e) =>
                        setEditLateReason(
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        No reason provided
                      </option>
                      <option value="Forgot">
                        Forgot
                      </option>
                      <option value="Financial difficulty">
                        Financial difficulty
                      </option>
                      <option value="Guardian unavailable">
                        Guardian unavailable
                      </option>
                      <option value="Payment problem">
                        Payment problem
                      </option>
                      <option value="Personal or emergency">
                        Personal or emergency
                      </option>
                      <option value="Other">
                        Other
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-payment-account">
                      Received Into
                    </label>

                    <select
                      id="edit-payment-account"
                      value={editPaymentAccount}
                      onChange={(e) =>
                        setEditPaymentAccount(
                          e.target.value
                        )
                      }
                      required
                    >
                      <option value="">
                        Select account
                      </option>

                      {accounts.map((account) => (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.name} (
                          {account.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-payment-notes">
                      Notes
                    </label>

                    <input
                      id="edit-payment-notes"
                      value={editPaymentNotes}
                      onChange={(e) =>
                        setEditPaymentNotes(
                          e.target.value
                        )
                      }
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                <div className="action-buttons">
                  <button
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Payment Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingPayment(null)
                    }
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {historyLoading ? (
            <p>Loading payment history...</p>
          ) : paymentHistory.length === 0 ? (
            <p>No payments recorded yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="tuition-table">
                <thead>
                  <tr>
                    <th>Payment Month</th>
                    <th>Amount</th>
                    <th>Payment Date</th>
                    <th>Account</th>
                    <th>Notes</th>
                    <th>Promised Date</th>
                    <th>Late Reason</th>
                    <th>Days Late</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paymentHistory.map(
                    (payment) => (
                      <tr
                        key={payment.payment_id}
                      >
                        <td>
                          {payment.payment_month}
                        </td>

                        <td>
                          {payment.currency ??
                            "BDT"}{" "}
                          {Number(
                            payment.amount
                          ).toLocaleString()}
                        </td>

                        <td>
                          {payment.payment_date}
                        </td>

                        <td>
                          {payment.account_name ??
                            "—"}
                        </td>

                        <td>
                          {payment.notes ?? "—"}
                        </td>

                        <td>
                          {payment.promised_payment_date ??
                            "—"}
                        </td>

                        <td>
                          {payment.late_reason ?? "—"}
                        </td>

                        <td>
                          {payment.days_late === null
                            ? "—"
                            : payment.days_late === 0
                            ? "On time"
                            : `${payment.days_late} day${
                                payment.days_late === 1
                                  ? ""
                                  : "s"
                              } late`}
                        </td>

                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              onClick={() =>
                                openEditPayment(
                                  payment
                                )
                              }
                              disabled={saving}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                cancelPayment(
                                  payment
                                )
                              }
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PAYMENT RELIABILITY */}

      <div className="card">
        <div className="section-header">
          <div>
            <h2>Payment Reliability</h2>
            <p>
              Reliability based on recorded payment dates.
            </p>
          </div>
        </div>

        {reliability.length === 0 ? (
          <p>No reliability data available yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="tuition-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Score</th>
                  <th>Rating</th>
                  <th>Total Payments</th>
                  <th>On Time</th>
                  <th>Late</th>
                  <th>Avg. Days Late</th>
                </tr>
              </thead>

              <tbody>
                {reliability.map(
                  (student, index) => (
                    <tr
                      key={
                        student.student_id
                      }
                    >
                      <td>#{index + 1}</td>

                      <td>
                        <strong>
                          {student.student_name}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {Number(
                            student.reliability_score
                          ).toFixed(0)}
                        </strong>
                        /100
                      </td>

                      <td>
                        <span
                          className={`badge ${reliabilityBadgeClass(
                            student.reliability_rating
                          )}`}
                        >
                          {
                            student.reliability_rating
                          }
                        </span>
                      </td>

                      <td>
                        {student.total_payments}
                      </td>

                      <td>
                        {student.on_time_payments}
                      </td>

                      <td>
                        {student.late_payments}
                      </td>

                      <td>
                        {Number(
                          student.average_days_late
                        ).toFixed(1)}{" "}
                        days
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STUDENTS */}

      <div className="card">
        <div className="section-header">
          <div>
            <h2>My Students</h2>
            <p>
              {students.length} active tuition students
            </p>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : students.length === 0 ? (
          <p>No tuition students added yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Monthly Fee</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>WhatsApp</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => {
                  const status =
                    getStatus(student.id);

                  const remaining = Number(
                    status?.remaining_amount ??
                      student.monthly_fee
                  );

                  const safeRemaining =
                    Number.isFinite(remaining)
                      ? Math.max(remaining, 0)
                      : 0;

                  return (
                    <tr key={student.id}>
                      <td>
                        <strong>
                          {student.student_name}
                        </strong>

                        {student.guardian_name && (
                          <div>
                            {student.guardian_name}
                          </div>
                        )}
                      </td>

                      <td>
                        BDT{" "}
                        {Number(
                          student.monthly_fee
                        ).toLocaleString()}
                      </td>

                      <td>
                        BDT{" "}
                        {Number(
                          status?.paid_amount ?? 0
                        ).toLocaleString()}
                      </td>

                      <td>
                        BDT{" "}
                        {safeRemaining.toLocaleString()}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            status?.payment_status ===
                            "paid"
                              ? "badge-success"
                              : status?.payment_status ===
                                "partial"
                              ? "badge-warning"
                              : "badge-danger"
                          }`}
                        >
                          {statusLabel(
                            status?.payment_status ??
                              "unpaid"
                          )}
                        </span>
                      </td>

                      <td>
                        {student.whatsapp_number ||
                          "—"}
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingStudent(
                                student
                              )
                            }
                            disabled={
                              saving ||
                              archiveLoading
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPaymentStudent(
                                student
                              );

                              setPaymentAmount(
                                String(
                                  safeRemaining
                                )
                              );

                              setPaymentMonth(
                                selectedMonth
                              );

                              if (
                                student.due_day !==
                                  null &&
                                student.due_day !==
                                  undefined
                              ) {
                                const [
                                  year,
                                  month,
                                ] =
                                  selectedMonth.split(
                                    "-"
                                  );

                                const lastDay =
                                  new Date(
                                    Number(year),
                                    Number(month),
                                    0
                                  ).getDate();

                                const actualDueDay =
                                  Math.min(
                                    student.due_day,
                                    lastDay
                                  );

                                setPromisedPaymentDate(
                                  `${year}-${month}-${String(
                                    actualDueDay
                                  ).padStart(2, "0")}`
                                );
                              } else {
                                setPromisedPaymentDate(
                                  ""
                                );
                              }

                              setLateReason("");
                            }}
                            disabled={
                              saving ||
                              archiveLoading
                            }
                          >
                            Record Payment
                          </button>

                          {student.whatsapp_number && (
                            <>
                              {status?.payment_status !==
                                "paid" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openWhatsApp(
                                      student,
                                      status,
                                      "reminder"
                                    )
                                  }
                                  disabled={
                                    saving ||
                                    archiveLoading
                                  }
                                >
                                  Reminder
                                </button>
                              )}

                              {Number(
                                status?.paid_amount ??
                                  0
                              ) > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openWhatsApp(
                                      student,
                                      status,
                                      "received"
                                    )
                                  }
                                  disabled={
                                    saving ||
                                    archiveLoading
                                  }
                                >
                                  Received
                                </button>
                              )}
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              loadPaymentHistory(
                                student
                              )
                            }
                            disabled={
                              saving ||
                              archiveLoading ||
                              historyLoading
                            }
                          >
                            History
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              archiveStudent(
                                student.id
                              )
                            }
                            disabled={
                              saving ||
                              archiveLoading
                            }
                          >
                            {archiveLoading
                              ? "Archiving..."
                              : "Archive"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .tuition-table {
            font-size: 13px;
          }

          .tuition-table th,
          .tuition-table td {
            padding: 9px 10px;
          }

          .tuition-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            white-space: normal;
          }

          .tuition-actions button {
            min-height: 36px;
            padding: 7px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </section>
  );
}

