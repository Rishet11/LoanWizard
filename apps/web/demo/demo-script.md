# Loan Wizard — 2-Minute Demo Script

## Setup (before presenting)
1. Open `https://loan-wizard.vercel.app` in a clean browser tab
2. Have camera + mic ready
3. DB shows 0 sessions (reset if needed)

## Script

**[0:00]** Open landing page.  
"This is Loan Wizard — a video-based, AI-guided loan application that generates a personalised offer in under 2 minutes."

**[0:15]** Point to the DPDP consent block.  
"We're fully DPDP-compliant — the customer sees exactly what data is collected and why, before they touch anything."

**[0:25]** Click "Start my session".  
Walk through the permission gate: camera → mic → location.  
"We request permissions one at a time with plain-language reasons — no legal boilerplate."

**[0:40]** Session page loads.  
Point to: recording indicator (top left), compliance badge (top right), video panel, live form (right), CV indicators (bottom).  
"The AI agent asks 4 questions. Answers are transcribed in real time and the form fills itself."

**[0:55]** As mock events replay, the form fields animate in.  
"Name, employment, income, loan amount — extracted from speech. The CV strip shows liveness and age estimate continuously."

**[1:15]** Click "End call".  
Processing page spins.  
"The ML service scores the profile and generates the offer in about 10 seconds."

**[1:30]** Offer page reveals.  
"₹5,00,000 at 13.5% p.a. — bold, clear, trustworthy."  
Click "Why this offer?" to expand reason codes.  
"Every factor is explained. No black box."

**[1:45]** Click "View Key Fact Statement".  
"RBI requires this before acceptance. One tap."

**[1:52]** Click "Accept this offer".  
Accepted page.  
"Session reference, cool-off disclosure, KFS download. Done."

**[2:00]** End.

## Fallback (if live demo fails)
Use the recorded walkthrough at `demo/fallback-recording.mp4` (record after deployment).
