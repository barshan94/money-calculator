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
  payment_month: string;
  amount: number;
  payment_date: string;
  account_name: string | null;
  currency: string | null;
  notes: string | null;
};

export default function TuitionPage() {
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statuses, setStatuses] = useState<TuitionStatus[]>([]);

  const [historyStudent, setHistoryStudent] =
    useState<Student | null>(null);

  const [paymentHistory, setPaymentHistory] =
    useState<PaymentHistory[]>([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contactLoading, setContactLoading] =
    useState(false);

  // Add student
  const [studentName, setStudentName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [dueDay, setDueDay] = useState("");

  // Edit student
  const [editingStudent, setEditingStudent] =
    useState<Student | null>(null);

  // Payment
  const [paymentStudent, setPaymentStudent] =
    useState<Student | null>(null);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");

  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [paymentMonth, setPaymentMonth] = useState(
    new Date().toISOString().slice(0, 7) + "-01"
  );

  const currentMonth =
    new Date().toISOString().slice(0, 7) + "-01";

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth);

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: studentData }, { data: accountData }] =
      await Promise.all([
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
          .order("name"),
      ]);

    setStudents((studentData as Student[]) ?? []);
    setAccounts((accountData as Account[]) ?? []);

    await loadStatuses(selectedMonth);

    setLoading(false);
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

  useEffect(() => {
    loadData();
  }, []);

  async function addStudent(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);

    const { error } = await supabase.rpc(
      "create_tuition_student",
      {
        p_student_name: studentName,
        p_guardian_name: guardianName || null,
        p_whatsapp_number: whatsapp || null,
        p_monthly_fee: Number(monthlyFee),
        p_due_day: dueDay
          ? Number(dueDay)
          : null,
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

    if (!editingStudent) return;

    setSaving(true);

    const { error } = await supabase.rpc(
      "update_tuition_student",
      {
        p_student_id: editingStudent.id,
        p_student_name:
          editingStudent.student_name,
        p_guardian_name:
          editingStudent.guardian_name || null,
        p_whatsapp_number:
          editingStudent.whatsapp_number || null,
        p_monthly_fee:
          Number(editingStudent.monthly_fee),
        p_due_day:
          editingStudent.due_day || null,
        p_notes:
          editingStudent.notes || null,
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

    if (!paymentStudent) return;

    if (!paymentAccount) {
      alert(
        "Please select the account that received the payment."
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "record_tuition_payment",
      {
        p_student_id: paymentStudent.id,
        p_payment_month: paymentMonth,
        p_amount: Number(paymentAmount),
        p_payment_date: paymentDate,
        p_account_id: paymentAccount,
        p_notes: null,
      }
    );

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    alert(
      "Tuition payment recorded successfully."
    );

    setPaymentStudent(null);
    setPaymentAmount("");
    setPaymentAccount("");

    await loadData();

    setSaving(false);
  }

  async function loadPaymentHistory(
    student: Student
  ) {
    setHistoryStudent(student);
    setHistoryLoading(true);

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

  async function archiveStudent(id: string) {
    const confirmed = window.confirm(
      "Archive this tuition student?"
    );

    if (!confirmed) return;

    const { error } = await supabase.rpc(
      "archive_tuition_student",
      {
        p_student_id: id,
      }
    );

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
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

      if (!contact) {
        return;
      }

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

      if (!contact) {
        return;
      }

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

    let message = "";

    if (type === "reminder") {
      message =
        `Hello, this is a reminder regarding ${student.student_name}'s ` +
        `tuition fee for this month.\n\n` +
        `Monthly fee: BDT ${student.monthly_fee.toLocaleString()}\n` +
        `Paid: BDT ${paid.toLocaleString()}\n` +
        `Remaining: BDT ${remaining.toLocaleString()}\n\n` +
        `Please let me know once the payment has been made. Thank you.`;
    } else {
      message =
        `Hello, this is to confirm the tuition payment for ` +
        `${student.student_name}.\n\n` +
        `Monthly fee: BDT ${student.monthly_fee.toLocaleString()}\n` +
        `Paid: BDT ${paid.toLocaleString()}\n` +
        `Remaining: BDT ${remaining.toLocaleString()}\n\n` +
        `Thank you for the payment.`;
    }

    const phone =
      student.whatsapp_number.replace(
        /\D/g,
        ""
      );

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(
        message
      )}`,
      "_blank"
    );
  }

  function getStatus(
    studentId: string
  ) {
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
          <label>Month</label>

          <input
            type="month"
            value={selectedMonth.slice(0, 7)}
            onChange={(e) => {
              const month =
                `${e.target.value}-01`;

              setSelectedMonth(month);
              setPaymentMonth(month);
              loadStatuses(month);
            }}
          />
        </div>

        <div className="grid-3">

          <div>
            <strong>
              {
                statuses.filter(
                  (s) =>
                    s.payment_status ===
                    "paid"
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
                    s.payment_status ===
                    "partial"
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
                    s.payment_status ===
                    "unpaid"
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
              <label>Student Name</label>

              <input
                value={studentName}
                onChange={(e) =>
                  setStudentName(
                    e.target.value
                  )
                }
                placeholder="Student name"
                required
              />
            </div>

            <div className="form-group">
              <label>Guardian Name</label>

              <input
                value={guardianName}
                onChange={(e) =>
                  setGuardianName(
                    e.target.value
                  )
                }
                placeholder="Parent / guardian"
              />
            </div>

            <div className="form-group">
              <label>WhatsApp Number</label>

              <input
                value={whatsapp}
                onChange={(e) =>
                  setWhatsapp(
                    e.target.value
                  )
                }
                placeholder="8801XXXXXXXXX"
              />

              {isContactPickerSupported() && (
                <button
                  type="button"
                  onClick={chooseContact}
                  disabled={contactLoading}
                  style={{
                    marginTop: 8,
                  }}
                >
                  {contactLoading
                    ? "Selecting..."
                    : "Choose from Contacts"}
                </button>
              )}
            </div>

            <div className="form-group">
              <label>Monthly Fee</label>

              <input
                type="number"
                min="1"
                value={monthlyFee}
                onChange={(e) =>
                  setMonthlyFee(
                    e.target.value
                  )
                }
                placeholder="3000"
                required
              />
            </div>

            <div className="form-group">
              <label>Due Day</label>

              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) =>
                  setDueDay(
                    e.target.value
                  )
                }
                placeholder="10"
              />
            </div>

          </div>

          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Adding..."
              : "Add Student"}
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
                <label>Student Name</label>

                <input
                  value={
                    editingStudent.student_name
                  }
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
                <label>Guardian Name</label>

                <input
                  value={
                    editingStudent.guardian_name ??
                    ""
                  }
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      guardian_name:
                        e.target.value ||
                        null,
                    })
                  }
                  placeholder="Parent / guardian"
                />
              </div>

              <div className="form-group">
                <label>WhatsApp Number</label>

                <input
                  value={
                    editingStudent.whatsapp_number ??
                    ""
                  }
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      whatsapp_number:
                        e.target.value ||
                        null,
                    })
                  }
                  placeholder="8801XXXXXXXXX"
                />

                {isContactPickerSupported() && (
                  <button
                    type="button"
                    onClick={
                      chooseContactForEdit
                    }
                    disabled={contactLoading}
                    style={{
                      marginTop: 8,
                    }}
                  >
                    {contactLoading
                      ? "Selecting..."
                      : "Choose from Contacts"}
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>Monthly Fee</label>

                <input
                  type="number"
                  min="1"
                  value={
                    editingStudent.monthly_fee
                  }
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      monthly_fee:
                        Number(
                          e.target.value
                        ),
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Due Day</label>

                <input
                  type="number"
                  min="1"
                  max="31"
                  value={
                    editingStudent.due_day ??
                    ""
                  }
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      due_day:
                        e.target.value
                          ? Number(
                              e.target.value
                            )
                          : null,
                    })
                  }
                  placeholder="10"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>

                <input
                  value={
                    editingStudent.notes ??
                    ""
                  }
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      notes:
                        e.target.value ||
                        null,
                    })
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
                  : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setEditingStudent(null)
                }
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
                <label>Payment Amount</label>

                <input
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
                <label>Payment Month</label>

                <input
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
                <label>Payment Date</label>

                <input
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
                <label>Received Into</label>

                <select
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

                  {accounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name} (
                        {account.currency})
                      </option>
                    )
                  )}
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
              }}
            >
              Close
            </button>

          </div>

          {historyLoading ? (
            <p>
              Loading payment history...
            </p>
          ) : paymentHistory.length === 0 ? (
            <p>
              No payments recorded yet.
            </p>
          ) : (
            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>Payment Month</th>
                    <th>Amount</th>
                    <th>Payment Date</th>
                    <th>Account</th>
                    <th>Notes</th>
                  </tr>
                </thead>

                <tbody>

                  {paymentHistory.map(
                    (payment) => (
                      <tr
                        key={
                          payment.payment_id
                        }
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
                          {payment.notes ??
                            "—"}
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
          <p>
            No tuition students added yet.
          </p>
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
                          status?.paid_amount ??
                            0
                        ).toLocaleString()}
                      </td>

                      <td>
                        BDT{" "}
                        {Number(
                          status?.remaining_amount ??
                            student.monthly_fee
                        ).toLocaleString()}
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

                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() =>
                              setEditingStudent(
                                student
                              )
                            }
                          >
                            Edit
                          </button>

                          {/* RECORD PAYMENT */}

                          <button
                            type="button"
                            onClick={() => {

                              setPaymentStudent(
                                student
                              );

                              setPaymentAmount(
                                String(
                                  Math.max(
                                    Number(
                                      status?.remaining_amount ??
                                        student.monthly_fee
                                    ),
                                    0
                                  )
                                )
                              );

                              setPaymentMonth(
                                selectedMonth
                              );

                            }}
                          >
                            Record Payment
                          </button>

                          {/* WHATSAPP */}

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
                                >
                                  Received
                                </button>
                              )}
                            </>
                          )}

                          {/* HISTORY */}

                          <button
                            type="button"
                            onClick={() =>
                              loadPaymentHistory(
                                student
                              )
                            }
                          >
                            History
                          </button>

                          {/* ARCHIVE */}

                          <button
                            type="button"
                            onClick={() =>
                              archiveStudent(
                                student.id
                              )
                            }
                          >
                            Archive
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

    </section>
  );
}