import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import Footer from '../components/Footer';
import { 
  Cookie, 
  ShieldCheck, 
  Database, 
  Sliders, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  HardDrive,
  Cpu
} from 'lucide-react';

const CookiePolicy: React.FC = () => {
  useSEO({
    title: 'Cookie & Browser Storage Policy',
    description: 'Understand how UniEval uses cookies, local storage, and cached data to provide a secure and instant engineering study experience.',
    canonical: 'https://unieval.in/cookie',
  });

  const lastUpdated = 'November 6, 2026';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link to="/" className="hover:text-brand-cobalt transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Cookie Policy</span>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 shadow-sm mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 to-brand-cobalt/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <Cookie className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight">
                  Cookie & Browser Storage Policy
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Zero Ad Trackers
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-2">
                Last Updated: <strong className="text-slate-700">{lastUpdated}</strong> • Transparent Technical Disclosure
              </p>
              <p className="text-slate-600 text-sm sm:text-base mt-4 leading-relaxed max-w-3xl">
                This Cookie Policy explains how UNIEVAL uses cookies, modern browser <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-slate-800">localStorage</code>, 
                <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-slate-800">sessionStorage</code>, and the Cache API. 
                We use these technologies exclusively to authenticate your account, remember your reading progress, 
                and provide instant offline-capable PDF loading.
              </p>
            </div>
          </div>
        </div>

        {/* Key Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Strictly Necessary Storage</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Tokens stored in your browser are used solely to keep you securely signed in and prevent unauthorized key harvesting.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 mt-3 flex items-center gap-1">
              Essential for Platform Function
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-cobalt flex items-center justify-center mb-3">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Sub-50ms PDF Unit Caching</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Decrypted study units are stored temporarily in your browser Cache API so you can flip between units without waiting or burning mobile data.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-brand-cobalt mt-3 flex items-center gap-1">
              Performance Optimization
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <XCircle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Zero Advertising Trackers</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                We do not use Google Ads cookies, Meta/Facebook tracking pixels, or cross-site fingerprinting scripts.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-rose-600 mt-3 flex items-center gap-1">
              No Third-Party Ad Networks
            </span>
          </div>
        </div>

        {/* Detailed Storage Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 shadow-sm space-y-12">
          
          {/* Section 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">What Are Cookies & Browser Web Storage?</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              When modern Single Page Applications (SPAs) like UNIEVAL operate, they store small pieces of state in your browser to maintain a seamless, responsive experience:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <HardDrive className="w-4 h-4 text-brand-cobalt shrink-0 mt-0.5" />
                <span><strong>HTTP Cookies:</strong> Small text snippets sent between your browser and our servers (e.g. Cloudflare DDoS cookies, Cashfree payment tokens).</span>
              </li>
              <li className="flex items-start gap-2">
                <HardDrive className="w-4 h-4 text-brand-cobalt shrink-0 mt-0.5" />
                <span><strong>Local Storage (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">localStorage</code>):</strong> A secure, origin-isolated storage area on your computer where your JWT authentication token is kept so you stay logged in after closing the browser.</span>
              </li>
              <li className="flex items-start gap-2">
                <HardDrive className="w-4 h-4 text-brand-cobalt shrink-0 mt-0.5" />
                <span><strong>Session Storage (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">sessionStorage</code>):</strong> Temporary storage that vanishes when you close the active browser tab (used for remembering which PDF page you were reading).</span>
              </li>
              <li className="flex items-start gap-2">
                <HardDrive className="w-4 h-4 text-brand-cobalt shrink-0 mt-0.5" />
                <span><strong>Browser Cache API:</strong> An isolated client-side caching store where decrypted PDF documents are held locally to eliminate repeated network fetches.</span>
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">Exact Technical Keys We Store & Why</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Below is an exhaustive, transparent list of every storage item UNIEVAL utilizes in your browser:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Storage Key</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Exact Purpose & Why We Need It</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-3 font-mono font-semibold text-slate-800">token</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-50 text-brand-cobalt font-semibold text-xs">localStorage</span></td>
                    <td className="p-3">Persistent until logout</td>
                    <td className="p-3">Stores your cryptographic JWT token so you don't have to re-enter your password every time you open a study unit.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-slate-800">unieval_cookie_consent</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-50 text-brand-cobalt font-semibold text-xs">localStorage</span></td>
                    <td className="p-3">1 Year</td>
                    <td className="p-3">Remembers that you have reviewed and acknowledged this cookie policy banner so it doesn't repeatedly obstruct your study screen.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-slate-800">pdf_page_{'{fileId}'}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold text-xs">sessionStorage</span></td>
                    <td className="p-3">Tab Session</td>
                    <td className="p-3">Restores the exact page you were on if you accidentally refresh the browser (e.g. Page 19 of Unit 3) so you never lose your place.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-slate-800">u_{'{userId}'}:{'{fileUrl}'}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-purple-50 text-brand-indigo font-semibold text-xs">Cache API</span></td>
                    <td className="p-3">30 Days (auto-purged on logout)</td>
                    <td className="p-3">Holds decrypted study document buffers locally in your browser memory. Delivers sub-50ms PDF load times without using mobile network data.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-slate-800">activeYearTab</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-50 text-brand-cobalt font-semibold text-xs">localStorage</span></td>
                    <td className="p-3">Persistent</td>
                    <td className="p-3">Remembers your selected academic year filter (FE, SE, TE, BE) across dashboard visits.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-slate-800">cf_clearance / __cf_bm</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-xs">Cookie</span></td>
                    <td className="p-3">30 min – 1 year</td>
                    <td className="p-3">Cloudflare edge security cookie used to distinguish human university students from malicious automated bots and scrapers.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-slate-800">Cashfree Checkout Tokens</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-xs">Cookie</span></td>
                    <td className="p-3">Session</td>
                    <td className="p-3">Used by the Cashfree SDK modal when processing credit card, netbanking, or UPI payments securely.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-navy">How to Manage, Clear, or Disable Cookies</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              You maintain complete authority over what is stored on your device. You can clear cookies and local storage at any time via your browser settings:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-600">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                <h4 className="font-bold text-slate-800">Google Chrome / Brave</h4>
                <p className="mt-1 text-slate-500">
                  Settings &rarr; Privacy and security &rarr; Third-party cookies &rarr; See all site data and permissions &rarr; Search &ldquo;unieval.in&rdquo; &rarr; Clear data.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                <h4 className="font-bold text-slate-800">Mozilla Firefox</h4>
                <p className="mt-1 text-slate-500">
                  Settings &rarr; Privacy &amp; Security &rarr; Cookies and Site Data &rarr; Manage Data &rarr; Search &ldquo;unieval.in&rdquo; &rarr; Remove Selected.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                <h4 className="font-bold text-slate-800">Apple Safari (macOS / iOS)</h4>
                <p className="mt-1 text-slate-500">
                  Preferences / Settings &rarr; Privacy &rarr; Manage Website Data &rarr; Find &ldquo;unieval.in&rdquo; &rarr; Remove.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                <h4 className="font-bold text-slate-800">Microsoft Edge</h4>
                <p className="mt-1 text-slate-500">
                  Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies and site data &rarr; See all cookies and site data.
                </p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 mt-3 flex items-start gap-2">
              <span className="font-bold shrink-0">Note:</span>
              <span>
                If you clear your local storage and cookies, your current session will be terminated and you will need to log back in. 
                Any offline cached PDF units will be purged and will re-download upon next view.
              </span>
            </div>
          </section>

          {/* Support Banner */}
          <section className="pt-4 border-t border-slate-100">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-50/60 border border-amber-100">
              <Mail className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-brand-navy">Questions Regarding Our Storage Architecture?</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  We believe in total transparency. If you have any technical inquiries about how our client-side decryption caching or session tokens function, contact our engineering and privacy team:
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-brand-cobalt">
                  <a href="mailto:privacy@unieval.in" className="hover:underline flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> privacy@unieval.in
                  </a>
                  <span className="text-slate-300">•</span>
                  <Link to="/privacy" className="hover:underline flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Read Full Privacy Policy
                  </Link>
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

export default CookiePolicy;
