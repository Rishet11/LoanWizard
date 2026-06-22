# Loan Wizard: 2-Minute Demo Script

## Setup (before presenting)
1. Open the Hugging Face web Space in a clean browser tab
2. Confirm `NEXT_PUBLIC_USE_MOCK_PERCEPTION=true` on the public link
3. Keep the HF ML Space `/docs` tab ready for the real-ML proof

## Script

**[0:00]** Open landing page.  
"This is Loan Wizard, a video-based, AI-guided loan application that generates a personalised offer in under 2 minutes."

**[0:15]** Point to the DPDP consent block.  
"We're fully DPDP-compliant: the customer sees exactly what data is collected and why, before they touch anything."

**[0:25]** Click "Start my session".  
The scripted public session starts without camera permission.
"The public link uses a deterministic scripted session so judges never get blocked by browser camera permissions."

**[0:40]** Session page loads.  
Point to: recording indicator (top left), compliance badge (top right), video panel, live form (right), CV indicators (bottom).  
"The AI agent asks the loan questions, and the same event bus used by the real camera path fills the application."

**[0:55]** As mock events replay, the form fields animate in.  
"Name, employment, income, loan amount: extracted from speech. The CV strip shows liveness and age estimate continuously."

**[1:15]** Click "End call".  
Processing page spins.  
"The public web flow uses the reliable instant offer. The separate HF ML Space is live for real Keras scoring."

**[1:30]** Offer page reveals.  
"₹5,00,000 at 13.5% p.a., bold, clear, trustworthy."  
Click "Why this offer?" to expand reason codes.  
"Every factor is explained. No black box."

**[1:45]** Click "View Key Fact Statement".  
"RBI requires this before acceptance. One tap."

**[1:52]** Click "Accept this offer".  
Accepted page.  
"Session reference, cool-off disclosure, KFS download. Done."

**[2:00]** End.

## Real-ML proof

Open the HF ML Space `/docs` or run the `/offer` curl from `docs/DEPLOYMENT.md`. For the recorded demo, also show the local real-camera path with `NEXT_PUBLIC_USE_MOCK_PERCEPTION=false` and `NEXT_PUBLIC_ML_MODE=real`.

## Fallback (if live demo fails)
Use the recorded walkthrough at `demo/fallback-recording.mp4` (record after deployment).
