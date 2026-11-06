import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import Footer from '../components/Footer';
import { 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  CreditCard, 
  Eye, 
  Server, 
  Database, 
  AlertCircle,
  HelpCircle,
  Mail,
  CheckCircle2,
  FileText
} from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  useSEO({
    title: 'Privacy Policy',
    description: 'Learn how UniEval collects, uses, encrypts, and protects your personal and academic information in compliance with data privacy regulations.',
    canonical: 'https://unieval.in/privacy',
  });

  const lastUpdated = 'November 6, 2026';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link to="/" className="hover:text-brand-cobalt transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Privacy Policy</span>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 shadow-sm mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-brand-cobalt/10 to-brand-indigo/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-brand-cobalt" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight">
                  UNIEVAL Privacy Policy
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-brand-cobalt border border-blue-200">
                  DPDP & GDPR Aligned
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-2">
                Last Updated: <strong className="text-slate-700">{lastUpdated}</strong> • Effective Date: Immediately upon publication
              </p>
              <p className="text-slate-600 text-sm sm:text-base mt-4 leading-relaxed max-w-3xl">
                At UNIEVAL (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), we take your privacy and the security of your academic records seriously. 
                This Privacy Policy explains with total transparency <strong>what personal and technical information we collect</strong>, 
                <strong>why we collect it</strong>, how it is encrypted and protected, and the controls you have over your data.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Highlights Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Zero Payment Credential Storage</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                All transactions are securely handled via Cashfree. We never see, store, or process your credit/debit card numbers, CVVs, or UPI PINs.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 mt-3 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> RBI Compliant Gateway
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-brand-indigo flex items-center justify-center mb-3">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">AES-256 Storage & HLS DRM</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Study notes are encrypted at rest with AES-256-GCM. Videos stream through adaptive HLS playlists with authenticated token decryption.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-brand-indigo mt-3 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> End-to-End Asset Protection
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-cobalt flex items-center justify-center mb-3">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">No Advertising or Data Brokerage</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                We never sell, rent, or trade your student profile or learning data to third-party advertisers or marketing data brokers.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-brand-cobalt mt-3 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Student-First Privacy
            </span>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 shadow-sm space-y-12">
          
          {/* Section 1 */}
          <section id="what-we-collect" className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">What Information We Collect</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              We collect only the minimum necessary information required to provide educational services, verify academic entitlements, process transactions, and safeguard intellectual property:
            </p>

            <div className="space-y-4 pt-2">
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/60">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-brand-cobalt" /> A. Personal Identification & Contact Details
                </h4>
                <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 mt-2 space-y-1 pl-1">
                  <li><strong>Full Name:</strong> Used to personalize your dashboard, issue certificates, and generate anti-piracy forensic watermarks.</li>
                  <li><strong>Email Address:</strong> Used as your unique account identifier, for OTP verification, password resets, purchase receipts, and critical class announcements.</li>
                  <li><strong>Mobile Phone Number:</strong> Used for SMS OTP two-factor verification during registration, account recovery, and security alerts.</li>
                  <li><strong>Academic Year & Branch:</strong> Your engineering semester (FE, SE, TE, BE) and branch (Computer, IT, Mechanical, EnTC, Civil, etc.) to tailor curriculum catalogs.</li>
                  <li><strong>College Domain / Institutional Email:</strong> (Optional) Used exclusively to verify eligibility for college-sponsored free access without manual administrative intervention.</li>
                </ul>
              </div>

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/60">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> B. Billing, Purchase & Subscription Data
                </h4>
                <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 mt-2 space-y-1 pl-1">
                  <li><strong>Transaction Records:</strong> Cashfree Order IDs, payment timestamps, amount paid in INR, currency, and coupon/discount codes applied.</li>
                  <li><strong>Entitlement Records:</strong> Purchased Course IDs, Note Package IDs, Subject Combo IDs, enrollment dates, and access expiration timestamps (standard 6-month validity or fixed date).</li>
                  <li><strong>Payment Card / UPI Security:</strong> Payment information is processed directly by Cashfree Payments India Private Limited under strict RBI regulations. UNIEVAL <em>never</em> accesses, records, or retains credit/debit card numbers, CVVs, or UPI banking PINs.</li>
                </ul>
              </div>

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/60">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Server className="w-4 h-4 text-brand-indigo" /> C. Academic Progress & Learning Diagnostics
                </h4>
                <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 mt-2 space-y-1 pl-1">
                  <li><strong>Study Notes & PDF Interactions:</strong> Current reading page position (saved in temporary browser <code className="text-xs bg-slate-200 px-1 py-0.5 rounded font-mono">sessionStorage</code>) to restore your place when you reopen a unit.</li>
                  <li><strong>Video Lecture Watch Time:</strong> Watch progress to sync playback across devices and maintain streaming session tokens.</li>
                  <li><strong>AI Quiz & Viva Assessments:</strong> Scores, question responses, diagnostic weak-spot recommendations, and oral viva speech/chat transcripts.</li>
                  <li><strong>Live Classroom Attendance:</strong> Webinar.gg WebRTC session join/leave timestamps to sync completed live classes and attendance rosters.</li>
                </ul>
              </div>

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/60">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" /> D. Technical, Security & Forensic Audit Logs
                </h4>
                <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 mt-2 space-y-1 pl-1">
                  <li><strong>Network & Device Identifiers:</strong> IP address, device type, browser user-agent, operating system, and approximate geographic location (city level).</li>
                  <li><strong>Authentication Security:</strong> Salted bcrypt password hashes (we never know or store plain-text passwords), JWT session tokens, and active session counts.</li>
                  <li><strong>Forensic Watermarking Details:</strong> Timestamped watermarks (incorporating your masked user ID, email, and IP) dynamically rendered over encrypted PDF viewers and video streams to trace unauthorized distribution and piracy.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section id="why-we-collect" className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Why We Collect Your Information (Purpose)</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every data point collected serves an explicit, legitimate academic or operational function:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs">
                <span className="text-xs font-bold text-brand-cobalt uppercase tracking-wider">Authentication & Access</span>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Verifying your identity, authenticating login sessions with JWT, and ensuring only authorized students access premium paid notes and live classes.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs">
                <span className="text-xs font-bold text-brand-cobalt uppercase tracking-wider">Institutional Verification</span>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Automatically checking student email domains against partnered engineering colleges to unlock free campus access without friction.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs">
                <span className="text-xs font-bold text-brand-cobalt uppercase tracking-wider">Order Fulfillment & Expiry</span>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Generating purchase receipts, tracking 6-month validity durations, and managing seamless enrollment into courses and subject bundles.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs">
                <span className="text-xs font-bold text-brand-cobalt uppercase tracking-wider">Intellectual Property & Anti-Piracy</span>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Protecting educators' proprietary notes and video streams from illegal scraping, screen capture, and unauthorized file sharing.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs">
                <span className="text-xs font-bold text-brand-cobalt uppercase tracking-wider">Personalized Academic Insights</span>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Curating past exam papers (PYQs), unit-wise notes, and diagnostic quiz feedback specifically tuned to your SPPU syllabus branch and year.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs">
                <span className="text-xs font-bold text-brand-cobalt uppercase tracking-wider">Security & DDoS Mitigation</span>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Preventing credential stuffing, unauthorized concurrent account sharing, and mitigating malicious cyber attacks via Cloudflare.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section id="data-encryption" className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Data Storage & Security Architecture</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              We employ military-grade security infrastructure to safeguard your information:
            </p>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>AES-256-GCM Note Encryption:</strong> All note files and document bundles are encrypted at rest. When streamed, files are decrypted in-memory through ephemeral authenticated proxy tunnels and never written unencrypted to public storage buckets.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>HLS Adaptive Bitrate DRM:</strong> Video lectures are segmented into encrypted HLS chunks using AES-128 bit keys. Keys are served only to authenticated, enrolled students through short-lived access tokens.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Password Protection:</strong> Passwords are encrypted using salted bcrypt hashing with high work factors. Plain-text passwords are never accessible to our administrators or engineering staff.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Transport Layer Security (TLS 1.3):</strong> All network communications between your browser, our Node.js API servers, and storage clusters are protected using modern SSL/TLS encryption.</span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="third-party" className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">4</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Third-Party Service Providers</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              We partner exclusively with reputable, enterprise infrastructure providers. These third parties receive only the data strictly necessary to fulfill their respective services:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Partner / Provider</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Cashfree Payments</td>
                    <td className="p-3">Payment processing & invoicing</td>
                    <td className="p-3">Order ID, customer email, phone, transaction amount</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Cloudflare (R2 & Edge CDN)</td>
                    <td className="p-3">Encrypted object storage, DDoS defense</td>
                    <td className="p-3">Encrypted file blobs, IP address (for edge rate limiting)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Webinar.gg / WebRTC</td>
                    <td className="p-3">Live interactive classrooms</td>
                    <td className="p-3">Student display name, audio/video stream during stage participation</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">MongoDB Atlas</td>
                    <td className="p-3">Encrypted primary database</td>
                    <td className="p-3">User account metadata, enrollments, course catalogs</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Fast2SMS / SMS Gateway</td>
                    <td className="p-3">Phone verification OTP delivery</td>
                    <td className="p-3">Mobile number, numeric one-time password</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 */}
          <section id="retention-and-rights" className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">5</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Your Rights & Data Retention</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              You maintain full ownership and control over your personal data:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-800">Right to Access & Rectify</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You can view and update your name, academic year, and branch anytime via your <Link to="/profile" className="text-brand-cobalt underline font-medium">Profile Settings</Link>.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-800">Right to Erasure (Account Deletion)</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You may request complete account deletion by contacting support. Upon verification, your profile, test scores, and credentials are permanently purged. Financial transaction invoices are retained only as required by Indian taxation statutes.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-800">Right to Revoke Cookie Consent</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You can clear your browser storage or cookies at any time, or modify your preferences as detailed in our <Link to="/cookie" className="text-brand-cobalt underline font-medium">Cookie Policy</Link>.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-800">Opt-Out of Promotional Notices</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You can unsubscribe from non-essential promotional emails or WhatsApp updates while retaining essential transaction and class schedule notices.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section id="contact-dpo" className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-blue-50/60 border border-blue-100">
              <Mail className="w-6 h-6 text-brand-cobalt shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-brand-navy">Questions or Data Privacy Inquiries?</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  If you have questions regarding this Privacy Policy, wish to exercise your data rights, or need assistance regarding data security, please reach out to our team:
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-brand-cobalt">
                  <a href="mailto:privacy@unieval.in" className="hover:underline flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> privacy@unieval.in
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

export default PrivacyPolicy;
