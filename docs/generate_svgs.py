import os

def create_security_matrix_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1060 670" width="1060" height="670">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090D16"/>
      <stop offset="50%" stop-color="#0E1626"/>
      <stop offset="100%" stop-color="#070A10"/>
    </linearGradient>

    <!-- Header Accent -->
    <linearGradient id="header-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="50%" stop-color="#818CF8"/>
      <stop offset="100%" stop-color="#C084FC"/>
    </linearGradient>

    <!-- Card 3D Depth Gradients -->
    <linearGradient id="card-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#162238" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.95"/>
    </linearGradient>

    <!-- Accents for each of the 6 cards -->
    <linearGradient id="cyan-acc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06B6D4"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
    <linearGradient id="amber-acc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#EF4444"/>
    </linearGradient>
    <linearGradient id="indigo-acc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#A855F7"/>
    </linearGradient>
    <linearGradient id="emerald-acc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#14B8A6"/>
    </linearGradient>
    <linearGradient id="blue-acc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
    <linearGradient id="rose-acc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F43F5E"/>
      <stop offset="100%" stop-color="#FB7185"/>
    </linearGradient>

    <!-- 3D Shadow Filters -->
    <filter id="card-shadow" x="-10%" y="-10%" width="125%" height="135%">
      <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#000000" flood-opacity="0.65"/>
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#38BDF8" flood-opacity="0.08"/>
    </filter>

    <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <pattern id="grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1E293B" stroke-width="0.8" stroke-opacity="0.4"/>
      <circle cx="0" cy="0" r="1.2" fill="#38BDF8" fill-opacity="0.2"/>
    </pattern>
  </defs>

  <style>
    .title-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 800; }
    .body-text  { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .mono-text  { font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace; }
  </style>

  <!-- Background Base -->
  <rect width="1060" height="670" rx="18" fill="url(#bg-grad)" stroke="#1E293B" stroke-width="1.5"/>
  <rect width="1060" height="670" rx="18" fill="url(#grid-pattern)"/>

  <!-- Top Ambient Glow -->
  <circle cx="530" cy="20" r="280" fill="#38BDF8" opacity="0.07" filter="url(#glow-cyan)"/>
  <circle cx="150" cy="600" r="220" fill="#6366F1" opacity="0.05" filter="url(#glow-cyan)"/>
  <circle cx="900" cy="580" r="220" fill="#10B981" opacity="0.05" filter="url(#glow-cyan)"/>

  <!-- HEADER -->
  <g transform="translate(50, 45)">
    <!-- Security Shield Badge -->
    <rect x="0" y="0" width="44" height="44" rx="12" fill="#0E2238" stroke="#38BDF8" stroke-width="1.5" filter="url(#card-shadow)"/>
    <path d="M22 8 L33 13 V23 C33 30 22 35 22 35 C22 35 11 30 11 23 V13 Z" fill="none" stroke="#38BDF8" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M18 21 L21 24 L27 18" fill="none" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>

    <text x="58" y="22" fill="url(#header-grad)" class="title-text" font-size="20" letter-spacing="1.5">LAYERED DEFENSE &amp; ZERO-TRUST SECURITY MATRIX</text>
    <text x="58" y="40" fill="#94A3B8" class="body-text" font-size="13">Cryptographic enforcement, continuous behavioral monitoring, and DRM-grade streaming protection</text>
  </g>

  <!-- ROW 1 CARDS (y = 115) -->

  <!-- CARD 1: Video Piracy -->
  <g transform="translate(50, 115)" filter="url(#card-shadow)">
    <!-- 3D Card Base -->
    <rect width="460" height="155" rx="14" fill="url(#card-grad)" stroke="#1E293B" stroke-width="1.2"/>
    <!-- Top 3D Highlight Line -->
    <rect x="14" y="0" width="432" height="2" fill="url(#cyan-acc)" rx="1"/>
    
    <!-- Icon Circle -->
    <rect x="20" y="20" width="40" height="40" rx="10" fill="#0C4A6E" fill-opacity="0.4" stroke="#0284C7" stroke-width="1"/>
    <path d="M33 32 L48 40 L33 48 Z" fill="#38BDF8"/>

    <!-- Threat Tag -->
    <text x="70" y="28" fill="#F87171" class="mono-text" font-size="10.5" font-weight="700" letter-spacing="1">THREAT: DIRECT MP4 PIRACY</text>
    <!-- Solution Title -->
    <text x="70" y="48" fill="#F8FAFC" class="title-text" font-size="15.5">AES-128 HLS Transcoding Engine</text>

    <!-- Status Pill -->
    <rect x="345" y="18" width="95" height="22" rx="11" fill="#0284C7" fill-opacity="0.2" stroke="#38BDF8" stroke-width="0.8"/>
    <text x="392" y="33" fill="#38BDF8" class="mono-text" font-size="9.5" font-weight="700" text-anchor="middle">DRM-GRADE</text>

    <!-- Details Divider -->
    <line x1="20" y1="72" x2="440" y2="72" stroke="#334155" stroke-width="0.8" stroke-dasharray="4 4"/>

    <!-- Bullet Points -->
    <circle cx="28" cy="94" r="3" fill="#38BDF8"/>
    <text x="40" y="98" fill="#CBD5E1" class="body-text" font-size="12">Multi-bitrate chunking (144p-1080p) via fluent-ffmpeg</text>
    
    <circle cx="28" cy="118" r="3" fill="#38BDF8"/>
    <text x="40" y="122" fill="#94A3B8" class="body-text" font-size="12">Zero raw MP4 URLs; context menu &amp; download disabled</text>

    <circle cx="28" cy="138" r="3" fill="#38BDF8"/>
    <text x="40" y="141" fill="#64748B" class="body-text" font-size="11">Ephemeral 16-byte keys generated per lecture session</text>
  </g>

  <!-- CARD 2: Screen Recording -->
  <g transform="translate(550, 115)" filter="url(#card-shadow)">
    <rect width="460" height="155" rx="14" fill="url(#card-grad)" stroke="#1E293B" stroke-width="1.2"/>
    <rect x="14" y="0" width="432" height="2" fill="url(#amber-acc)" rx="1"/>

    <rect x="20" y="20" width="40" height="40" rx="10" fill="#78350F" fill-opacity="0.4" stroke="#D97706" stroke-width="1"/>
    <!-- Watermark eye icon -->
    <circle cx="40" cy="40" r="6" fill="#FBBF24"/>
    <path d="M28 40 C32 33 48 33 52 40 C48 47 32 47 28 40 Z" fill="none" stroke="#FBBF24" stroke-width="1.8"/>

    <text x="70" y="28" fill="#F87171" class="mono-text" font-size="10.5" font-weight="700" letter-spacing="1">THREAT: SCREEN RECORDING LEAKS</text>
    <text x="70" y="48" fill="#F8FAFC" class="title-text" font-size="15.5">Dynamic Floating Watermark</text>

    <rect x="330" y="18" width="110" height="22" rx="11" fill="#D97706" fill-opacity="0.2" stroke="#F59E0B" stroke-width="0.8"/>
    <text x="385" y="33" fill="#FBBF24" class="mono-text" font-size="9.5" font-weight="700" text-anchor="middle">ACTIVE TRACING</text>

    <line x1="20" y1="72" x2="440" y2="72" stroke="#334155" stroke-width="0.8" stroke-dasharray="4 4"/>

    <circle cx="28" cy="94" r="3" fill="#F59E0B"/>
    <text x="40" y="98" fill="#CBD5E1" class="body-text" font-size="12">Student identity overlay moves randomly every 15-20s</text>

    <circle cx="28" cy="118" r="3" fill="#F59E0B"/>
    <text x="40" y="122" fill="#94A3B8" class="body-text" font-size="12">Persistent in fullscreen, cinema mode, and mobile rotate</text>

    <circle cx="28" cy="138" r="3" fill="#F59E0B"/>
    <text x="40" y="141" fill="#64748B" class="body-text" font-size="11">Forensic attribution deters unauthorized sharing</text>
  </g>

  <!-- ROW 2 CARDS (y = 295) -->

  <!-- CARD 3: Account Sharing -->
  <g transform="translate(50, 295)" filter="url(#card-shadow)">
    <rect width="460" height="155" rx="14" fill="url(#card-grad)" stroke="#1E293B" stroke-width="1.2"/>
    <rect x="14" y="0" width="432" height="2" fill="url(#indigo-acc)" rx="1"/>

    <rect x="20" y="20" width="40" height="40" rx="10" fill="#312E81" fill-opacity="0.4" stroke="#6366F1" stroke-width="1"/>
    <!-- Session Device Icon -->
    <rect x="30" y="30" width="20" height="14" rx="2" fill="none" stroke="#818CF8" stroke-width="1.6"/>
    <line x1="37" y1="46" x2="43" y2="46" stroke="#818CF8" stroke-width="2"/>

    <text x="70" y="28" fill="#F87171" class="mono-text" font-size="10.5" font-weight="700" letter-spacing="1">THREAT: CREDENTIAL &amp; PASS SHARING</text>
    <text x="70" y="48" fill="#F8FAFC" class="title-text" font-size="15.5">Single-Device Session Guard</text>

    <rect x="340" y="18" width="100" height="22" rx="11" fill="#4338CA" fill-opacity="0.25" stroke="#818CF8" stroke-width="0.8"/>
    <text x="390" y="33" fill="#A5B4FC" class="mono-text" font-size="9.5" font-weight="700" text-anchor="middle">ZERO-TRUST</text>

    <line x1="20" y1="72" x2="440" y2="72" stroke="#334155" stroke-width="0.8" stroke-dasharray="4 4"/>

    <circle cx="28" cy="94" r="3" fill="#818CF8"/>
    <text x="40" y="98" fill="#CBD5E1" class="body-text" font-size="12">Cryptographic activeSessionId tracked in user record</text>

    <circle cx="28" cy="118" r="3" fill="#818CF8"/>
    <text x="40" y="122" fill="#94A3B8" class="body-text" font-size="12">Instant invalidation of old devices upon new login</text>

    <circle cx="28" cy="138" r="3" fill="#818CF8"/>
    <text x="40" y="141" fill="#64748B" class="body-text" font-size="11">Prevents concurrent lecture streaming across locations</text>
  </g>

  <!-- CARD 4: Account Compromise / 2FA -->
  <g transform="translate(550, 295)" filter="url(#card-shadow)">
    <rect width="460" height="155" rx="14" fill="url(#card-grad)" stroke="#1E293B" stroke-width="1.2"/>
    <rect x="14" y="0" width="432" height="2" fill="url(#emerald-acc)" rx="1"/>

    <rect x="20" y="20" width="40" height="40" rx="10" fill="#064E3B" fill-opacity="0.4" stroke="#059669" stroke-width="1"/>
    <!-- Lock 2FA Icon -->
    <rect x="32" y="34" width="16" height="13" rx="2" fill="none" stroke="#34D399" stroke-width="1.8"/>
    <path d="M36 34 V30 C36 27.5 44 27.5 44 30 V34" fill="none" stroke="#34D399" stroke-width="1.8"/>

    <text x="70" y="28" fill="#F87171" class="mono-text" font-size="10.5" font-weight="700" letter-spacing="1">THREAT: BRUTE FORCE &amp; HIJACKING</text>
    <text x="70" y="48" fill="#F8FAFC" class="title-text" font-size="15.5">Mandatory RFC 6238 TOTP 2FA</text>

    <rect x="330" y="18" width="110" height="22" rx="11" fill="#059669" fill-opacity="0.2" stroke="#10B981" stroke-width="0.8"/>
    <text x="385" y="33" fill="#34D399" class="mono-text" font-size="9.5" font-weight="700" text-anchor="middle">MANDATORY 2FA</text>

    <line x1="20" y1="72" x2="440" y2="72" stroke="#334155" stroke-width="0.8" stroke-dasharray="4 4"/>

    <circle cx="28" cy="94" r="3" fill="#34D399"/>
    <text x="40" y="98" fill="#CBD5E1" class="body-text" font-size="12">Standard TOTP compatible with Google Authenticator &amp; Authy</text>

    <circle cx="28" cy="118" r="3" fill="#34D399"/>
    <text x="40" y="122" fill="#94A3B8" class="body-text" font-size="12">Server-enforced student policy: 2FA cannot be disabled</text>

    <circle cx="28" cy="138" r="3" fill="#34D399"/>
    <text x="40" y="141" fill="#64748B" class="body-text" font-size="11">Rate-limited code validation with exponential backoff</text>
  </g>

  <!-- ROW 3 CARDS (y = 475) -->

  <!-- CARD 5: Cross Batch Access -->
  <g transform="translate(50, 475)" filter="url(#card-shadow)">
    <rect width="460" height="155" rx="14" fill="url(#card-grad)" stroke="#1E293B" stroke-width="1.2"/>
    <rect x="14" y="0" width="432" height="2" fill="url(#blue-acc)" rx="1"/>

    <rect x="20" y="20" width="40" height="40" rx="10" fill="#1E3A8A" fill-opacity="0.4" stroke="#2563EB" stroke-width="1"/>
    <!-- Layers Icon -->
    <path d="M40 28 L51 34 L40 40 L29 34 Z" fill="none" stroke="#60A5FA" stroke-width="1.6"/>
    <path d="M29 39 L40 45 L51 39" fill="none" stroke="#60A5FA" stroke-width="1.6"/>
    <path d="M29 44 L40 50 L51 44" fill="none" stroke="#60A5FA" stroke-width="1.6"/>

    <text x="70" y="28" fill="#F87171" class="mono-text" font-size="10.5" font-weight="700" letter-spacing="1">THREAT: CROSS-BATCH SNOOPING</text>
    <text x="70" y="48" fill="#F8FAFC" class="title-text" font-size="15.5">Batch Isolation &amp; Strict Limit</text>

    <rect x="330" y="18" width="110" height="22" rx="11" fill="#1D4ED8" fill-opacity="0.25" stroke="#3B82F6" stroke-width="0.8"/>
    <text x="385" y="33" fill="#60A5FA" class="mono-text" font-size="9.5" font-weight="700" text-anchor="middle">BATCH ISOLATED</text>

    <line x1="20" y1="72" x2="440" y2="72" stroke="#334155" stroke-width="0.8" stroke-dasharray="4 4"/>

    <circle cx="28" cy="94" r="3" fill="#60A5FA"/>
    <text x="40" y="98" fill="#CBD5E1" class="body-text" font-size="12">Cryptographic batch check before releasing HLS keys</text>

    <circle cx="28" cy="118" r="3" fill="#60A5FA"/>
    <text x="40" y="122" fill="#94A3B8" class="body-text" font-size="12">Single batch change policy strictly guarded on backend</text>

    <circle cx="28" cy="138" r="3" fill="#60A5FA"/>
    <text x="40" y="141" fill="#64748B" class="body-text" font-size="11">Lectures, notes, and exams segmented by batch ID</text>
  </g>

  <!-- CARD 6: Exam Misconduct -->
  <g transform="translate(550, 475)" filter="url(#card-shadow)">
    <rect width="460" height="155" rx="14" fill="url(#card-grad)" stroke="#1E293B" stroke-width="1.2"/>
    <rect x="14" y="0" width="432" height="2" fill="url(#rose-acc)" rx="1"/>

    <rect x="20" y="20" width="40" height="40" rx="10" fill="#881337" fill-opacity="0.4" stroke="#BE123C" stroke-width="1"/>
    <!-- Webcam / AI Lens Icon -->
    <circle cx="40" cy="40" r="9" fill="none" stroke="#FB7185" stroke-width="1.8"/>
    <circle cx="40" cy="40" r="3" fill="#FB7185"/>

    <text x="70" y="28" fill="#F87171" class="mono-text" font-size="10.5" font-weight="700" letter-spacing="1">THREAT: ACADEMIC EXAM CHEATING</text>
    <text x="70" y="48" fill="#F8FAFC" class="title-text" font-size="15.5">AI Computer Vision Proctor</text>

    <rect x="330" y="18" width="110" height="22" rx="11" fill="#BE123C" fill-opacity="0.25" stroke="#F43F5E" stroke-width="0.8"/>
    <text x="385" y="33" fill="#FDA4AF" class="mono-text" font-size="9.5" font-weight="700" text-anchor="middle">AI PROCTORED</text>

    <line x1="20" y1="72" x2="440" y2="72" stroke="#334155" stroke-width="0.8" stroke-dasharray="4 4"/>

    <circle cx="28" cy="94" r="3" fill="#FB7185"/>
    <text x="40" y="98" fill="#CBD5E1" class="body-text" font-size="12">TensorFlow.js multi-face &amp; unauthorized device detection</text>

    <circle cx="28" cy="118" r="3" fill="#FB7185"/>
    <text x="40" y="122" fill="#94A3B8" class="body-text" font-size="12">Fullscreen lockdown, tab-blur telemetry &amp; clipboard freeze</text>

    <circle cx="28" cy="138" r="3" fill="#FB7185"/>
    <text x="40" y="141" fill="#64748B" class="body-text" font-size="11">Automated test termination upon exceeding violations</text>
  </g>
</svg>'''
    with open("docs/assets/security-matrix.svg", "w", encoding="utf-8") as f:
        f.write(svg)
    print("Created docs/assets/security-matrix.svg")

def create_system_architecture_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1140 820" width="1140" height="820">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="arch-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080C15"/>
      <stop offset="40%" stop-color="#0D1527"/>
      <stop offset="100%" stop-color="#060911"/>
    </linearGradient>

    <!-- Header Gradient -->
    <linearGradient id="arch-header" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="35%" stop-color="#818CF8"/>
      <stop offset="100%" stop-color="#34D399"/>
    </linearGradient>

    <!-- Layer Card Gradients (3D Glassmorphism) -->
    <linearGradient id="tier1-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#14243D" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#0B1322" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="tier2-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#182138" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#0B111D" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="tier3-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1C2038" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#0D0F1C" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="tier4-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#11292B" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#081416" stop-opacity="0.95"/>
    </linearGradient>

    <!-- Sub-module Gradients -->
    <linearGradient id="box-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.95"/>
    </linearGradient>

    <!-- Flow Arrow Gradients -->
    <linearGradient id="flow-down" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#818CF8"/>
    </linearGradient>

    <!-- Filters -->
    <filter id="tier-shadow" x="-5%" y="-5%" width="110%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000000" flood-opacity="0.7"/>
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#38BDF8" flood-opacity="0.12"/>
    </filter>

    <filter id="box-glow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.5"/>
    </filter>

    <pattern id="arch-grid" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1E293B" stroke-width="0.7" stroke-opacity="0.35"/>
      <circle cx="0" cy="0" r="1" fill="#38BDF8" fill-opacity="0.2"/>
    </pattern>
  </defs>

  <style>
    .arch-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 800; }
    .arch-sub   { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .arch-mono  { font-family: 'JetBrains Mono', Consolas, monospace; }
  </style>

  <!-- Background Base -->
  <rect width="1140" height="820" rx="20" fill="url(#arch-bg)" stroke="#1E293B" stroke-width="1.5"/>
  <rect width="1140" height="820" rx="20" fill="url(#arch-grid)"/>

  <!-- Top Ambient Glows -->
  <circle cx="570" cy="20" r="300" fill="#38BDF8" opacity="0.08" filter="blur(30px)"/>
  <circle cx="1000" cy="400" r="250" fill="#10B981" opacity="0.05" filter="blur(30px)"/>
  <circle cx="100" cy="500" r="250" fill="#818CF8" opacity="0.05" filter="blur(30px)"/>

  <!-- HEADER -->
  <g transform="translate(50, 40)">
    <rect x="0" y="0" width="42" height="42" rx="10" fill="#0E2238" stroke="#38BDF8" stroke-width="1.4"/>
    <path d="M12 28 L21 13 L30 28 Z M16 23 H26" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linejoin="round"/>
    
    <text x="56" y="20" fill="url(#arch-header)" class="arch-title" font-size="21" letter-spacing="1.2">MENTORE SOLUTION LMS — ENTERPRISE SYSTEM ARCHITECTURE</text>
    <text x="56" y="38" fill="#94A3B8" class="arch-sub" font-size="12.5">End-to-End Distributed Stack: Reactive Client SPA, Cryptographic Gateway, Microservices, and Persistence Engine</text>
  </g>

  <!-- ========================================== -->
  <!-- TIER 1: CLIENT EXPERIENCE LAYER (y = 95)    -->
  <!-- ========================================== -->
  <g transform="translate(50, 95)" filter="url(#tier-shadow)">
    <!-- Main Tier Enclosure -->
    <rect width="1040" height="130" rx="14" fill="url(#tier1-grad)" stroke="#0284C7" stroke-width="1.2"/>
    <!-- Top glowing accent -->
    <rect x="14" y="0" width="1012" height="2" fill="#38BDF8" rx="1"/>

    <!-- Tier Label -->
    <rect x="20" y="12" width="280" height="22" rx="6" fill="#0369A1" fill-opacity="0.3"/>
    <text x="30" y="27" fill="#38BDF8" class="arch-mono" font-size="11" font-weight="700">TIER 1 • FRONTEND REACT 18 SPA</text>
    <text x="960" y="27" fill="#64748B" class="arch-mono" font-size="10" text-anchor="end">Vite 6 • Tailwind v4 • TanStack Query</text>

    <!-- Sub Modules -->
    <!-- Module 1A -->
    <g transform="translate(20, 42)" filter="url(#box-glow)">
      <rect width="235" height="74" rx="8" fill="url(#box-grad)" stroke="#334155" stroke-width="1"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">Student Portal</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">Dashboard, Batch Guard &amp; Nav</text>
      <text x="14" y="58" fill="#38BDF8" class="arch-mono" font-size="9.5">GridFS PDF &amp; Notes Reader</text>
    </g>

    <!-- Module 1B -->
    <g transform="translate(275, 42)" filter="url(#box-glow)">
      <rect width="245" height="74" rx="8" fill="url(#box-grad)" stroke="#0284C7" stroke-width="1.2"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">Custom VLC Player</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">HLS.js Adaptive Bitrate (144p-1080p)</text>
      <text x="14" y="58" fill="#F59E0B" class="arch-mono" font-size="9.5">Dynamic Floating Watermark</text>
    </g>

    <!-- Module 1C -->
    <g transform="translate(540, 42)" filter="url(#box-glow)">
      <rect width="245" height="74" rx="8" fill="url(#box-grad)" stroke="#F43F5E" stroke-width="1.2"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">AI Proctoring Suite</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">TensorFlow.js &amp; COCO-SSD Vision</text>
      <text x="14" y="58" fill="#FB7185" class="arch-mono" font-size="9.5">Lockdown &amp; Tab-Blur Telemetry</text>
    </g>

    <!-- Module 1D -->
    <g transform="translate(805, 42)" filter="url(#box-glow)">
      <rect width="215" height="74" rx="8" fill="url(#box-grad)" stroke="#334155" stroke-width="1"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">Trainer &amp; Admin Suite</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">Google Drive Ingestion &amp; Exams</text>
      <text x="14" y="58" fill="#34D399" class="arch-mono" font-size="9.5">Batch Manager &amp; Job Portal</text>
    </g>
  </g>

  <!-- INTER-TIER 1->2 CONNECTOR (y = 232) -->
  <g transform="translate(50, 230)">
    <line x1="280" y1="0" x2="280" y2="40" stroke="#38BDF8" stroke-width="1.8" stroke-dasharray="4 3"/>
    <line x1="780" y1="0" x2="780" y2="40" stroke="#818CF8" stroke-width="1.8" stroke-dasharray="4 3"/>

    <!-- Connector Badges -->
    <rect x="200" y="8" width="160" height="22" rx="11" fill="#0F172A" stroke="#38BDF8" stroke-width="1"/>
    <text x="280" y="23" fill="#38BDF8" class="arch-mono" font-size="10" font-weight="700" text-anchor="middle">HTTPS / REST JSON API</text>

    <rect x="700" y="8" width="160" height="22" rx="11" fill="#0F172A" stroke="#818CF8" stroke-width="1"/>
    <text x="780" y="23" fill="#A5B4FC" class="arch-mono" font-size="10" font-weight="700" text-anchor="middle">WSS / SOCKET.IO EVENTS</text>
  </g>

  <!-- ========================================== -->
  <!-- TIER 2: API GATEWAY & SECURITY (y = 275)    -->
  <!-- ========================================== -->
  <g transform="translate(50, 275)" filter="url(#tier-shadow)">
    <rect width="1040" height="130" rx="14" fill="url(#tier2-grad)" stroke="#4F46E5" stroke-width="1.2"/>
    <rect x="14" y="0" width="1012" height="2" fill="#818CF8" rx="1"/>

    <rect x="20" y="12" width="310" height="22" rx="6" fill="#3730A3" fill-opacity="0.3"/>
    <text x="30" y="27" fill="#A5B4FC" class="arch-mono" font-size="11" font-weight="700">TIER 2 • API GATEWAY &amp; SECURITY LAYER</text>
    <text x="960" y="27" fill="#64748B" class="arch-mono" font-size="10" text-anchor="end">Express.js 4.21 • Helmet • Mongo Sanitize</text>

    <!-- Module 2A -->
    <g transform="translate(20, 42)" filter="url(#box-glow)">
      <rect width="320" height="74" rx="8" fill="url(#box-grad)" stroke="#4338CA" stroke-width="1"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">Identity &amp; Auth Guard</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">JWT Bearer Sessions • Bcrypt.js Hashing</text>
      <text x="14" y="58" fill="#A5B4FC" class="arch-mono" font-size="9.5">Single-Device Active Session Invalidator</text>
    </g>

    <!-- Module 2B -->
    <g transform="translate(360, 42)" filter="url(#box-glow)">
      <rect width="320" height="74" rx="8" fill="url(#box-grad)" stroke="#059669" stroke-width="1.2"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">Mandatory 2FA Engine</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">RFC 6238 TOTP (otpauth &amp; qrcode)</text>
      <text x="14" y="58" fill="#34D399" class="arch-mono" font-size="9.5">Google Authenticator • Locked for Students</text>
    </g>

    <!-- Module 2C -->
    <g transform="translate(700, 42)" filter="url(#box-glow)">
      <rect width="320" height="74" rx="8" fill="url(#box-grad)" stroke="#0284C7" stroke-width="1.2"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">Stream Gatekeeper</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">Batch Authorization (req.user.batch check)</text>
      <text x="14" y="58" fill="#38BDF8" class="arch-mono" font-size="9.5">Ephemeral AES-128 Key Server (/api/stream)</text>
    </g>
  </g>

  <!-- INTER-TIER 2->3 CONNECTOR (y = 412) -->
  <g transform="translate(50, 410)">
    <line x1="350" y1="0" x2="350" y2="40" stroke="#818CF8" stroke-width="1.8" stroke-dasharray="4 3"/>
    <line x1="720" y1="0" x2="720" y2="40" stroke="#C084FC" stroke-width="1.8" stroke-dasharray="4 3"/>

    <rect x="420" y="8" width="220" height="22" rx="11" fill="#0F172A" stroke="#818CF8" stroke-width="1"/>
    <text x="530" y="23" fill="#C084FC" class="arch-mono" font-size="10" font-weight="700" text-anchor="middle">ASYNC QUEUE &amp; SERVICE BUS</text>
  </g>

  <!-- ========================================== -->
  <!-- TIER 3: SERVICES & PROCESSING (y = 455)    -->
  <!-- ========================================== -->
  <g transform="translate(50, 455)" filter="url(#tier-shadow)">
    <rect width="1040" height="130" rx="14" fill="url(#tier3-grad)" stroke="#7C3AED" stroke-width="1.2"/>
    <rect x="14" y="0" width="1012" height="2" fill="#A855F7" rx="1"/>

    <rect x="20" y="12" width="310" height="22" rx="6" fill="#5B21B6" fill-opacity="0.3"/>
    <text x="30" y="27" fill="#C084FC" class="arch-mono" font-size="11" font-weight="700">TIER 3 • CORE SERVICES &amp; WORKERS</text>
    <text x="960" y="27" fill="#64748B" class="arch-mono" font-size="10" text-anchor="end">Fluent-FFmpeg • P-Queue Concurrency • Google APIs</text>

    <!-- Module 3A -->
    <g transform="translate(20, 42)" filter="url(#box-glow)">
      <rect width="320" height="74" rx="8" fill="url(#box-grad)" stroke="#7C3AED" stroke-width="1"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">Google Drive Ingestion</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">Service Account (Drive API v3)</text>
      <text x="14" y="58" fill="#C084FC" class="arch-mono" font-size="9.5">Automated OBS Stream Downloads</text>
    </g>

    <!-- Module 3B -->
    <g transform="translate(360, 42)" filter="url(#box-glow)">
      <rect width="320" height="74" rx="8" fill="url(#box-grad)" stroke="#2563EB" stroke-width="1.2"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">FFmpeg Transcoder Pipeline</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">P-Queue Worker (Concurrency: 1)</text>
      <text x="14" y="58" fill="#60A5FA" class="arch-mono" font-size="9.5">Multi-Bitrate AES-128 HLS Packaging</text>
    </g>

    <!-- Module 3C -->
    <g transform="translate(700, 42)" filter="url(#box-glow)">
      <rect width="320" height="74" rx="8" fill="url(#box-grad)" stroke="#059669" stroke-width="1"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">Real-Time Event Engine</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">Socket.IO Room-Based Clusters</text>
      <text x="14" y="58" fill="#34D399" class="arch-mono" font-size="9.5">Q&amp;A Threads, Transcoding % &amp; Badges</text>
    </g>
  </g>

  <!-- INTER-TIER 3->4 CONNECTOR (y = 592) -->
  <g transform="translate(50, 590)">
    <line x1="300" y1="0" x2="300" y2="40" stroke="#A855F7" stroke-width="1.8" stroke-dasharray="4 3"/>
    <line x1="750" y1="0" x2="750" y2="40" stroke="#10B981" stroke-width="1.8" stroke-dasharray="4 3"/>

    <rect x="430" y="8" width="200" height="22" rx="11" fill="#0F172A" stroke="#10B981" stroke-width="1"/>
    <text x="530" y="23" fill="#34D399" class="arch-mono" font-size="10" font-weight="700" text-anchor="middle">PERSISTENCE &amp; STORAGE I/O</text>
  </g>

  <!-- ========================================== -->
  <!-- TIER 4: PERSISTENCE & STORAGE (y = 635)    -->
  <!-- ========================================== -->
  <g transform="translate(50, 635)" filter="url(#tier-shadow)">
    <rect width="1040" height="130" rx="14" fill="url(#tier4-grad)" stroke="#059669" stroke-width="1.2"/>
    <rect x="14" y="0" width="1012" height="2" fill="#10B981" rx="1"/>

    <rect x="20" y="12" width="310" height="22" rx="6" fill="#064E3B" fill-opacity="0.3"/>
    <text x="30" y="27" fill="#34D399" class="arch-mono" font-size="11" font-weight="700">TIER 4 • DATA PERSISTENCE &amp; STORAGE</text>
    <text x="960" y="27" fill="#64748B" class="arch-mono" font-size="10" text-anchor="end">MongoDB 7+ • Mongoose 8.7 • GridFS • S3/R2 Ready</text>

    <!-- Module 4A -->
    <g transform="translate(20, 42)" filter="url(#box-glow)">
      <rect width="320" height="74" rx="8" fill="url(#box-grad)" stroke="#059669" stroke-width="1"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">MongoDB Atlas Cluster</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">Users, Batches, Lectures, Q&amp;A</text>
      <text x="14" y="58" fill="#34D399" class="arch-mono" font-size="9.5">Exams, Violations &amp; Job Listings</text>
    </g>

    <!-- Module 4B -->
    <g transform="translate(360, 42)" filter="url(#box-glow)">
      <rect width="320" height="74" rx="8" fill="url(#box-grad)" stroke="#10B981" stroke-width="1.2"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">MongoDB GridFS Bucket</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">Binary Storage for Lecture Notes &amp; PDFs</text>
      <text x="14" y="58" fill="#6EE7B7" class="arch-mono" font-size="9.5">Magic-Byte MIME Security Scanner</text>
    </g>

    <!-- Module 4C -->
    <g transform="translate(700, 42)" filter="url(#box-glow)">
      <rect width="320" height="74" rx="8" fill="url(#box-grad)" stroke="#0284C7" stroke-width="1.2"/>
      <text x="14" y="24" fill="#F8FAFC" class="arch-title" font-size="13">Encrypted HLS Vault</text>
      <text x="14" y="42" fill="#94A3B8" class="arch-sub" font-size="11">AES-128 Rendition Segments (.ts files)</text>
      <text x="14" y="58" fill="#38BDF8" class="arch-mono" font-size="9.5">Pluggable: Local / AWS S3 / Cloudflare R2</text>
    </g>
  </g>

  <!-- Bottom Footer Branding -->
  <text x="570" y="795" fill="#475569" class="arch-mono" font-size="11" text-anchor="middle">
    MENTORE SOLUTION LMS • HIGH-AVAILABILITY MULTI-TENANT EDUCATIONAL ARCHITECTURE
  </text>
</svg>'''
    with open("docs/assets/system-architecture.svg", "w", encoding="utf-8") as f:
        f.write(svg)
    print("Created docs/assets/system-architecture.svg")

if __name__ == "__main__":
    os.makedirs("docs/assets", exist_ok=True)
    create_security_matrix_svg()
    create_system_architecture_svg()
