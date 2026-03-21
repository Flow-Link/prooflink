"use client"

import { useReveal } from "@/hooks/use-reveal"
import { useState, useEffect } from "react"
import { MagneticButton } from "@/components/magnetic-button"


const COLORS = {
  navy: "#0A1628",
  brandBlue: "#2563EB",
  brandTeal: "#0D9488",
  lightBlue: "#EFF6FF",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  successGreen: "#059669",
  border: "#E2E8F0",
  white: "#FFFFFF",
}

function ComplianceStep({ label, detail, delay, active }: { label: string; detail: string; delay: number; active: boolean }) {
  const [state, setState] = useState("waiting")

  useEffect(() => {
    if (!active) {
      setState("waiting")
      return
    }
    const t1 = setTimeout(() => setState("checking"), delay)
    const t2 = setTimeout(() => setState("done"), delay + 800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [active, delay])

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        opacity: state === "waiting" ? 0.4 : 1,
        transition: "all 0.4s ease",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          background: state === "done" ? "#ECFDF5" : state === "checking" ? "#FEF3C7" : "#F1F5F9",
          color: state === "done" ? COLORS.successGreen : state === "checking" ? "#D97706" : COLORS.textMuted,
          border: `1.5px solid ${state === "done" ? COLORS.successGreen : state === "checking" ? "#D97706" : COLORS.border}`,
          transition: "all 0.3s ease",
        }}
      >
        {state === "done" ? (
          "✓"
        ) : state === "checking" ? (
          <div
            style={{
              width: 12,
              height: 12,
              border: "2px solid #D97706",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }}
          />
        ) : (
          "○"
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.textPrimary }}>{label}</div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>{detail}</div>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.03em",
          color: state === "done" ? COLORS.successGreen : state === "checking" ? "#D97706" : COLORS.textMuted,
        }}
      >
        {state === "done" ? "PASSED" : state === "checking" ? "CHECKING..." : "PENDING"}
      </div>
    </div>
  )
}

function PaymentDemo() {
  const [step, setStep] = useState(0)
  const [complianceActive, setComplianceActive] = useState(false)
  const [allChecked, setAllChecked] = useState(false)

  const steps = [
    { label: "Enter Payment", icon: "💳" },
    { label: "Compliance", icon: "🛡️" },
    { label: "Confirmed", icon: "✓" },
    { label: "Receipt", icon: "📄" },
  ]

  const handleSendPayment = () => {
    setStep(1)
    setComplianceActive(true)
    setTimeout(() => {
      setAllChecked(true)
      setTimeout(() => setStep(2), 600)
    }, 3200)
  }

  const handleViewReceipt = () => {
    window.open('/FlowLink_Transaction_Receipt.pdf', '_blank')
  }
  
  const handleReset = () => {
    setStep(0)
    setComplianceActive(false)
    setAllChecked(false)
  }

  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 4px 40px rgba(10,22,40,0.08), 0 1px 3px rgba(10,22,40,0.04)",
        border: `1px solid ${COLORS.border}`,
        maxWidth: 480,
        width: "100%",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: "flex", background: "#F8FAFC", borderBottom: `1px solid ${COLORS.border}` }}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: "12px 8px",
              textAlign: "center",
              borderBottom: i <= step ? `2px solid ${COLORS.brandBlue}` : "2px solid transparent",
              transition: "all 0.3s ease",
            }}
          >
            <div style={{ fontSize: 16 }}>{i < step ? "✓" : s.icon}</div>
            <div
              style={{
                fontSize: 10,
                fontWeight: i <= step ? 600 : 400,
                marginTop: 2,
                color: i <= step ? COLORS.brandBlue : COLORS.textMuted,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "24px 28px" }}>
        {step === 0 && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.navy, marginBottom: 16 }}>Send Compliant Payment</div>
            <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, display: "block", marginBottom: 4 }}>
              RECIPIENT
            </label>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: "#F8FAFC",
                fontSize: 13,
                color: COLORS.textPrimary,
                marginBottom: 14,
              }}
            >
              DevStudio GmbH — Berlin, Germany
            </div>
            <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, display: "block", marginBottom: 4 }}>
              AMOUNT
            </label>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${COLORS.brandBlue}`,
                background: COLORS.lightBlue,
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.navy,
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>12,500.00</span>
              <span
                style={{
                  fontSize: 12,
                  background: COLORS.white,
                  padding: "4px 10px",
                  borderRadius: 6,
                  color: COLORS.brandBlue,
                  fontWeight: 600,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                USDC
              </span>
            </div>
            <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, display: "block", marginBottom: 4 }}>
              REFERENCE
            </label>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: "#F8FAFC",
                fontSize: 13,
                color: COLORS.textSecondary,
                marginBottom: 20,
              }}
            >
              INV-2026-0892 — Q1 Dev Services
            </div>
            <button
              onClick={handleSendPayment}
              style={{
                width: "100%",
                padding: "13px 0",
                borderRadius: 10,
                background: `linear-gradient(135deg, ${COLORS.brandBlue}, ${COLORS.brandTeal})`,
                color: COLORS.white,
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.02em",
                boxShadow: "0 2px 12px rgba(37,99,235,0.3)",
              }}
            >
              Send Payment →
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>Running Compliance Checks</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>Real-time verification</div>
            <ComplianceStep label="Sanctions Screening" detail="OFAC, EU, UN, HMT lists" delay={200} active={complianceActive} />
            <ComplianceStep
              label="KYC Verification"
              detail="Originator & Beneficiary identity"
              delay={800}
              active={complianceActive}
            />
            <ComplianceStep label="Travel Rule (FATF R.16)" detail="Transmitting required party data" delay={1400} active={complianceActive} />
            <ComplianceStep
              label="Wallet Risk Assessment"
              detail="On-chain exposure analysis"
              delay={2000}
              active={complianceActive}
            />
            <ComplianceStep label="AML Transaction Monitor" detail="Pattern analysis & risk scoring" delay={2600} active={complianceActive} />
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#ECFDF5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 28,
                border: `2px solid ${COLORS.successGreen}`,
              }}
            >
              ✓
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>Payment Confirmed</div>
            <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 }}>
              12,500.00 USDC sent to DevStudio GmbH
            </div>
            <button
              onClick={handleViewReceipt}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                background: COLORS.navy,
                color: COLORS.white,
                fontWeight: 700,
                fontSize: 13,
                border: "none",
                cursor: "pointer",
              }}
            >
              📄 View Receipt
            </button>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.navy, marginBottom: 12 }}>Transaction Receipt</div>
            <div
              style={{
                background: COLORS.white,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "16px",
                textAlign: "left",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {[
                ["Sanctions", "CLEARED"],
                ["KYC", "VERIFIED"],
                ["Travel Rule", "COMPLIANT"],
                ["AML Check", "PASSED"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "5px 0",
                    borderBottom: `1px solid #F1F5F9`,
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: COLORS.textSecondary }}>{k}</span>
                  <span style={{ color: COLORS.successGreen, fontWeight: 600, fontSize: 10 }}>✓ {v}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleReset}
              style={{
                marginTop: 14,
                padding: "10px 24px",
                borderRadius: 8,
                background: "transparent",
                color: COLORS.brandBlue,
                fontWeight: 600,
                fontSize: 12,
                border: `1.5px solid ${COLORS.brandBlue}`,
                cursor: "pointer",
              }}
            >
              ↺ Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ContactSection() {
  const { ref, isVisible } = useReveal(0.3)

  return (
    <>
      <section
        ref={ref}
        className="flex min-h-screen w-full snap-start items-center justify-center px-4 pt-20 md:px-12 md:pt-0 lg:px-16"
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-12 text-center md:mb-16">
            <div
              className={`transition-all duration-700 ${
                isVisible ? "translate-y-0 opacity-100" : "-translate-y-12 opacity-0"
              }`}
            >
              <h2 className="mb-2 font-sans text-4xl font-light leading-[1.05] tracking-tight text-foreground md:mb-3 md:text-7xl lg:text-8xl">
                Live Demo
              </h2>
              <p className="font-mono text-xs text-blue-300 md:text-base">/ Experience FlowLink in Action</p>
            </div>
          </div>

          <div
            className={`flex justify-center transition-all duration-700 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            <PaymentDemo />
          </div>

          <div
            className={`mt-12 flex flex-col items-center gap-4 text-center transition-all duration-700 md:mt-16 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            <p className="max-w-2xl text-sm text-foreground/90 md:text-lg">
              Watch as your payment passes through all compliance checks in real-time — sanctions screening, KYC verification, Travel Rule compliance, and AML monitoring — all automated.
            </p>
            <MagneticButton size="lg" variant="primary">
              Start Your Journey
            </MagneticButton>
          </div>
        </div>
      </section>
    </>
  )
}
