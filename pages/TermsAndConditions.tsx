import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import Footer from '../components/Footer';
import { 
  FileText, 
  AlertTriangle, 
  Lock, 
  Clock, 
  DollarSign, 
  Video, 
  CheckCircle2, 
  XCircle, 
  Mail,
  Scale
} from 'lucide-react';

const TermsAndConditions: React.FC = () => {
  useSEO({
    title: 'Terms and Conditions',
    description: 'Read the official Terms of Service and Conditions governing the use of UNIEVAL educational courses, notes, and digital services.',
    canonical: 'https://unieval.in/terms',
  });

  const lastUpdated = 'November 6, 2026';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link to="/" className="hover:text-brand-cobalt transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Terms & Conditions</span>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 shadow-sm mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-brand-indigo/10 to-brand-cobalt/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-brand-indigo" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight">
                  Terms of Service & Conditions
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-brand-indigo border border-purple-200">
                  Legal Agreement
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-2">
                Last Updated: <strong className="text-slate-700">{lastUpdated}</strong> • Applies to all registered users and visitors
              </p>
              <p className="text-slate-600 text-sm sm:text-base mt-4 leading-relaxed max-w-3xl">
                Please read these Terms and Conditions (&ldquo;Terms&rdquo;) carefully before accessing or using the UNIEVAL platform. 
                By creating an account, browsing content, enrolling in courses, or purchasing study materials, 
                you agree to be legally bound by these Terms and our Privacy Policy.
              </p>
            </div>
          </div>
        </div>

        {/* Essential Rules Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Strict Anti-Piracy & DRM</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Screen recording, ripping HLS streams, distributing PDFs, or sharing accounts is strictly prohibited and tracked via dynamic forensic watermarks.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-rose-600 mt-3 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Criminal Prosecution Under IT Act
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-cobalt flex items-center justify-center mb-3">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">6-Month Access Validity</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Course and note purchases provide access for a strict 6-month validity period (or configured term) from the moment of enrollment.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-brand-cobalt mt-3 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Automated Lifecycle Scheduler
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Digital Goods Refund Policy</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Because notes and video courses are immediately accessible upon purchase, all sales are final once content is accessed. Accidental double charges are refunded within 48h.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 mt-3 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cashfree Payment Gateway
            </span>
          </div>
        </div>

        {/* Detailed Legal Clauses */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 shadow-sm space-y-12">
          
          {/* Clause 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Acceptance & Scope of Agreement</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              These Terms constitute an electronic record in terms of the Information Technology Act, 2000 and rules thereunder as applicable. 
              By clicking &ldquo;Create Account&rdquo;, &ldquo;Verify &amp; Create Account&rdquo;, &ldquo;Enroll&rdquo;, or by accessing any UNIEVAL web service, 
              you confirm that you are at least 18 years of age (or have parental/guardian consent if under 18) and possess the legal authority to enter into these binding terms.
            </p>
          </section>

          {/* Clause 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Single-User License & Account Security</h2>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Individual Non-Commercial License:</strong> Each account is granted on a strictly single-user, non-transferable, non-exclusive, revocable basis for personal exam preparation and study.</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span><strong>No Account Sharing or Pooling:</strong> You may not share your login credentials with classmates, study groups, or third parties. Our system monitors concurrent IP addresses, geographic anomalies, and device tokens to detect unauthorized shared usage.</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span><strong>Account Security:</strong> You are responsible for safeguarding your password and mobile OTP. If you suspect unauthorized access to your account, you must immediately reset your password and notify UNIEVAL support.</span>
              </li>
            </ul>
          </section>

          {/* Clause 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Intellectual Property & Anti-Piracy DRM Protection</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              All materials hosted on UNIEVAL — including handwritten and digital notes, PDF packages, Adaptive Bitrate HLS video streams, audio recordings, 
              curated past question papers (PYQs), oral viva preparation rubrics, software code, and AI quiz questions — are protected by Indian and International Copyright Laws.
            </p>

            <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Explicitly Prohibited Violations:
              </h4>
              <ul className="list-disc list-inside text-xs sm:text-sm text-rose-800 space-y-1.5 pl-1">
                <li>Recording screens via OBS, QuickTime, Camtasia, browser extensions, or hardware capture cards during video playback or PDF reading.</li>
                <li>Scraping, intercepting, or downloading raw HLS <code className="bg-white/80 px-1 py-0.5 rounded font-mono">.m3u8</code> playlists or <code className="bg-white/80 px-1 py-0.5 rounded font-mono">.ts</code> video segments.</li>
                <li>Attempting to decrypt, reverse engineer, or capture backend AES-128 or AES-256 decryption keys.</li>
                <li>Redistributing, printing for resale, or uploading downloaded study materials to Telegram channels, WhatsApp groups, Google Drive, Discord, or course repositories.</li>
                <li>Altering, obscuring, or removing dynamic forensic watermarks rendered over materials.</li>
              </ul>
              <p className="text-xs text-rose-700 font-medium pt-2">
                <strong>Forensic Watermarking Notice:</strong> Every digital document and video stream dynamically imprints a visible and invisible forensic watermark identifying your full name, registered email, IP address, and session timestamp. Any pirated material found online containing your watermark will result in instantaneous lifetime account revocation and criminal prosecution under Sections 65 &amp; 66 of the Information Technology Act, 2000 and Section 63 of the Copyright Act, 1957.
              </p>
            </div>
          </section>

          {/* Clause 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">4</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Course & Note Validity Periods</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Access to courses, note packages, and subject combos is time-limited based on academic semester cycles:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-brand-cobalt shrink-0 mt-0.5" />
                <span><strong>Standard Validity Duration:</strong> Unless otherwise specified on the course or note package card, all purchases provide digital access for exactly <strong>6 months (180 days)</strong> from the moment payment is verified.</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-brand-cobalt shrink-0 mt-0.5" />
                <span><strong>Fixed Expiry Date Model:</strong> Certain specialized crash courses or exam bootcamps may feature a fixed calendar expiration date (e.g., the final date of the SPPU End-Sem exam session). Access terminates automatically at 11:59 PM IST on that date.</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-brand-cobalt shrink-0 mt-0.5" />
                <span><strong>Automatic Revocation:</strong> Our automated background scheduler cleans up expired purchases daily. Once expired, materials will no longer be visible on your dashboard or streamable via video/PDF viewers unless re-enrolled.</span>
              </li>
            </ul>
          </section>

          {/* Clause 5 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">5</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Pricing, Payments & Refund Policy</h2>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                <strong>Currency & Taxes:</strong> All fees are stated in Indian Rupees (INR ₹) and are inclusive of applicable goods and services taxes unless explicitly noted.
              </p>
              <p>
                <strong>Payment Processing:</strong> Payments are processed securely through Cashfree. UNIEVAL is not liable for bank network downtimes, UPI app timeouts, or banking gateway failures outside our control.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-800 text-sm">Refund Policy for Digital Content:</h4>
                <p className="mt-1 text-slate-600">
                  Because digital educational content (including encrypted PDF downloads, notes, and video lectures) is unlocked and delivered immediately upon payment completion, <strong>all purchases are strictly non-refundable</strong> once the course or note package has been accessed or viewed.
                </p>
                <p className="mt-2 text-slate-600">
                  <strong>Duplicate Charge Exception:</strong> If you are accidentally charged twice for the same transaction due to a network glitch, contact <a href="mailto:support@unieval.in" className="text-brand-cobalt underline font-medium">support@unieval.in</a> within 48 hours with your Cashfree Order ID. Upon verification, the duplicate charge will be refunded to your original payment method within 5–7 business days.
                </p>
              </div>
            </div>
          </section>

          {/* Clause 6 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">6</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Live Classroom Code of Conduct</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Live sessions conducted via Webinar.gg are virtual academic lecture halls. Students participating in live classes must maintain the highest standards of decorum:
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-slate-600 pl-1">
              <li>No abusive language, profanity, harassment, or trolling in live chat.</li>
              <li>No spamming links, promotional messages, or irrelevant material.</li>
              <li>Do not attempt to record or rebroadcast live WebRTC streams.</li>
              <li>Instructors and moderators possess full authority to mute, disable stage access, or permanently ban disruptive students without refund.</li>
            </ul>
          </section>

          {/* Clause 7 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">7</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Educational Disclaimer & Limitation of Liability</h2>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs sm:text-sm text-amber-900 leading-relaxed space-y-2">
              <p>
                <strong>Independent Platform:</strong> UNIEVAL is an independent educational technology platform. UNIEVAL is <strong>not affiliated with, associated with, or endorsed by Savitribai Phule Pune University (SPPU)</strong> or any governmental university board.
              </p>
              <p>
                <strong>Supplementary Aid:</strong> All study materials, important questions, PYQ analyses, and AI exam intelligence models are supplementary study aids prepared by experienced educators. UNIEVAL does not guarantee that specific questions will appear on university exam papers or guarantee specific grade outcomes.
              </p>
              <p>
                <strong>Liability Limit:</strong> In no event shall UNIEVAL, its directors, or instructors be liable for indirect, incidental, or consequential damages resulting from platform use or exam results. Our maximum aggregate liability shall not exceed the amount paid by you for the specific course or note package giving rise to the claim.
              </p>
            </div>
          </section>

          {/* Clause 8 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">8</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Governing Law & Jurisdiction</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of India. 
              Any disputes, claims, or controversies arising out of or in connection with these Terms or the use of UNIEVAL 
              shall be subject to the exclusive jurisdiction of the competent courts in <strong>Pune, Maharashtra, India</strong>.
            </p>
          </section>

          {/* Support Banner */}
          <section className="pt-4 border-t border-slate-100">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-purple-50/60 border border-purple-100">
              <Scale className="w-6 h-6 text-brand-indigo shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-brand-navy">Need Clarification on our Terms?</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  If you represent an educational institution seeking campus licensing, or if you have questions regarding our legal agreements, please reach out to our legal and support team:
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-brand-indigo">
                  <a href="mailto:legal@unieval.in" className="hover:underline flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> legal@unieval.in
                  </a>
                  <span className="text-slate-300">•</span>
                  <a href="mailto:support@unieval.in" className="hover:underline flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> support@unieval.in
                  </a>
                </div>
              </div>
            </div>
          </section>

        </div>

      </main>

      <Footer />
    </div>
  );
};

export default TermsAndConditions;
