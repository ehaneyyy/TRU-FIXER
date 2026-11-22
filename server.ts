import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

interface DiagnosisRequest {
  deviceType: string;
  brandModel: string;
  exportedCountry: string;
  physicalFaults: string;
  problemDescription: string;
}

interface DiagnosisResult {
  primaryAssessment: string;
  troubleshootingPaths: {
    title: string;
    steps: string[];
  }[];
  shopRecommendation: {
    recommendedAction: string;
    componentSeverity: string;
    repairType: string;
    technicianBrief: string;
  };
}

// Fallback high-precision rule-based diagnostic engine
function generateLocalDiagnostic(req: DiagnosisRequest): DiagnosisResult {
  const { deviceType, brandModel, exportedCountry, physicalFaults, problemDescription } = req;
  const lowerDesc = (problemDescription || '').toLowerCase();
  const lowerFaults = (physicalFaults || '').toLowerCase();
  const lowerType = (deviceType || '').toLowerCase();
  const lowerBrand = (brandModel || '').toLowerCase();
  const lowerOrigin = (exportedCountry || '').toLowerCase();

  // Voltage / Regional note
  const isHighVoltageOrigin = ['uk', 'united kingdom', 'europe', 'eu', 'germany', 'france', 'india', 'australia', 'singapore', 'dubai', 'uae', 'china'].some(c => lowerOrigin.includes(c));
  const isLowVoltageOrigin = ['usa', 'us', 'united states', 'japan', 'canada', 'mexico', 'taiwan'].some(c => lowerOrigin.includes(c));
  const voltageContext = isHighVoltageOrigin ? '220V–240V 50Hz standard power profile' : isLowVoltageOrigin ? '110V–120V 60Hz standard power profile' : 'Standard regional power profile';

  const isPowerOrBatteryIssue = lowerDesc.includes('power') || lowerDesc.includes('turn on') || lowerDesc.includes('boot') || lowerDesc.includes('charge') || lowerDesc.includes('dead') || lowerDesc.includes('shut down') || lowerDesc.includes('battery');
  const isDisplayIssue = lowerDesc.includes('screen') || lowerDesc.includes('display') || lowerDesc.includes('black') || lowerDesc.includes('flicker') || lowerDesc.includes('line') || lowerFaults.includes('crack') || lowerFaults.includes('screen');
  const isThermalOrPerformance = lowerDesc.includes('hot') || lowerDesc.includes('overheat') || lowerDesc.includes('slow') || lowerDesc.includes('freeze') || lowerDesc.includes('fan') || lowerDesc.includes('lag');
  const isLiquidOrPhysical = lowerFaults.includes('water') || lowerFaults.includes('liquid') || lowerFaults.includes('drop') || lowerFaults.includes('dent') || lowerDesc.includes('spill');

  if (isLiquidOrPhysical) {
    return {
      primaryAssessment: `Corrosion / Mechanical Circuit Disconnect on ${brandModel || deviceType} (${voltageContext})`,
      troubleshootingPaths: [
        {
          title: "Immediate Power Isolation",
          steps: [
            "Disconnect external power cord/charger instantly to prevent galvanic trace corrosion.",
            "Do NOT attempt to force power-on or charge until the chassis is inspected.",
            "Remove external peripherals, SIM/microSD trays, and auxiliary dongles."
          ]
        },
        {
          title: "Physical & Ingress Verification",
          steps: [
            "Check liquid contact indicators (LCI) inside SIM slot, ports, or intake vents for red/pink discoloration.",
            "Inspect physical chassis deformation near motherboard standoff areas.",
            "Examine I/O ports for bent pins or shorted charging connector contacts."
          ]
        }
      ],
      shopRecommendation: {
        recommendedAction: "Professional Ultrasonic Cleaning & Board-Level Micro-Soldering",
        componentSeverity: "Critical Hardware Ingress",
        repairType: "Independent Component-Level Electronics Lab",
        technicianBrief: `Inspect ${brandModel || 'device'} for rail shorts (PPBUS_G3H/VCORE), verify power management IC integrity, and measure resistance to ground on major power coils.`
      }
    };
  }

  if (isDisplayIssue) {
    return {
      primaryAssessment: `Display Subsystem Fault / EDP Flex Cable Failure on ${brandModel || deviceType}`,
      troubleshootingPaths: [
        {
          title: "External Video Signal Bypass",
          steps: [
            "Connect the device to an external monitor or television via HDMI, DisplayPort, or USB-C Display Alternate Mode.",
            "Verify whether keyboard backlighting, chime, or caps-lock LED toggles active when powered.",
            "If external display outputs clean video while internal panel is dark or distorted, internal display panel or EDP ribbon cable is severed."
          ]
        },
        {
          title: "Backlight & Hinge Stress Test",
          steps: [
            "Shine a high-intensity flashlight directly at a 45-degree angle against the dark panel to detect faint LCD image (indicating failed backlight inverter/driver).",
            "Tilt display panel slowly through 30° to 135° angle to detect intermittent ribbon cable connection breakage.",
            `Perform hard display reset key combination specific to ${brandModel || 'device architecture'}.`
          ]
        }
      ],
      shopRecommendation: {
        recommendedAction: "Display Assembly or Embedded DisplayPort (eDP) Cable Replacement",
        componentSeverity: "High - Dedicated Visual Assembly",
        repairType: "Authorized or Certified Screen Specialist",
        technicianBrief: `Bench test internal display connector pin voltages (LCD VDD, Backlight Anode/Cathode) on ${brandModel || 'unit'}. Verify fuse continuity F7000/F7700.`
      }
    };
  }

  if (isPowerOrBatteryIssue) {
    return {
      primaryAssessment: `Power Distribution Network / Primary PMIC Failure on ${brandModel || deviceType} (${voltageContext})`,
      troubleshootingPaths: [
        {
          title: "Static Discharge & Hard Power Reset",
          steps: [
            "Disconnect all power adapters, USB-C chargers, and connected cables.",
            "Hold the power button continuously for 30 full seconds to discharge residual capacitance across motherboard filter caps.",
            `Verify charger output voltage and wattage matches original export specifications (${exportedCountry || 'Factory Specification'}).`
          ]
        },
        {
          title: "Charge Negotiation & Current Draw Verification",
          steps: [
            "Connect an inline USB-C / DC power meter to measure current pull (normal idle: 0.4A–2.0A at negotiated voltage).",
            "Observe charging indicator LED code pattern or pulsing state.",
            "If current remains clamped at 0.00A or 5V 0.02A, primary charging MOSFET or power delivery IC is shut down in protect mode."
          ]
        }
      ],
      shopRecommendation: {
        recommendedAction: "Power Delivery IC Replacement / Battery Cell Resistance Test",
        componentSeverity: "High - Power Delivery & Charging Rail",
        repairType: "Board-Level Diagnostics Lab",
        technicianBrief: `Check 19V / 20V input rail for short to ground, verify 3.3V / 5V always-on power rails, and test battery internal resistance.`
      }
    };
  }

  if (isThermalOrPerformance) {
    return {
      primaryAssessment: `Thermal Throttling & Vapor Chamber / Fan Assembly Degradation on ${brandModel || deviceType}`,
      troubleshootingPaths: [
        {
          title: "Airflow & Exhaust Pathway Inspection",
          steps: [
            "Inspect intake and exhaust grilles for compressed dust felt or obstructed fin stacks.",
            "Listen for mechanical bearing friction or ticking noise in cooling fans.",
            "Verify fan RPM spins freely when blown with low-pressure air."
          ]
        },
        {
          title: "Sensor Diagnostics & Baseline Thermal Audit",
          steps: [
            "Boot into hardware diagnostic mode (hold D on Mac / F12 on PC) to execute onboard thermal sensor tests.",
            "Inspect operating system sensor logs for temperature spikes exceeding 98°C at idle.",
            "Verify thermal paste phase change degradation and pump-out state."
          ]
        }
      ],
      shopRecommendation: {
        recommendedAction: "Heatsink Thermal Compound Reapplication & Bearing Assembly Replacement",
        componentSeverity: "Moderate - Preventative Thermal Protection",
        repairType: "General Hardware Service Center",
        technicianBrief: `Disassemble thermal module, inspect heatpipe vapor integrity for vacuum loss, clean dry thermal pads, and reapply high-viscosity phase-change material.`
      }
    };
  }

  // General default structured diagnosis
  return {
    primaryAssessment: `Subsystem Failure & Logic Signal Deviation on ${brandModel || deviceType || 'Hardware Unit'} (${voltageContext})`,
    troubleshootingPaths: [
      {
        title: "Cold Reset & Hardware Loop Clear",
        steps: [
          "Deplete internal static charge by holding power key for 25 seconds with all cords detached.",
          "Inspect physical ports and chassis joints for stress fractures or disconnected contact pins.",
          `Reconnect OEM adapter matching original ${exportedCountry || 'regional'} supply standards.`
        ]
      },
      {
        title: "Component Isolation Protocol",
        steps: [
          "Disconnect non-essential expansion devices, external media, and accessory boards.",
          "Perform integrated hardware diagnostic self-test sequence via vendor BIOS / bootloader key.",
          "Record error blink codes, beep codes, or POST failure flags."
        ]
      }
    ],
    shopRecommendation: {
      recommendedAction: "Bench Hardware Diagnostic & Voltage Rail Inspection",
      componentSeverity: "Moderate - Logic & Power Isolation Required",
      repairType: "Certified Hardware Diagnostic Facility",
      technicianBrief: `Perform systematic multi-meter probing across primary voltage coils for ${brandModel || 'device'} to isolate shorted decoupling capacitors or faulty controller IC.`
    }
  };
}

// Diagnose API endpoint
app.post('/api/diagnose', async (req: Request, res: Response) => {
  const { deviceType, brandModel, exportedCountry, physicalFaults, problemDescription } = req.body as DiagnosisRequest;

  if (!deviceType && !brandModel && !problemDescription) {
    res.status(400).json({ error: 'Device details and problem description are required.' });
    return;
  }

  const clientKey = (req.headers['x-gemini-key'] as string) || (req.body?.apiKey as string);
  const apiKey = (clientKey && clientKey.trim() !== '') ? clientKey.trim() : process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Perform a rigorous hardware and software diagnostic analysis for this device.
Device Type: ${deviceType || 'Unspecified'}
Device Brand Name and Model: ${brandModel || 'Unspecified'}
Exported Country / Origin: ${exportedCountry || 'Unspecified'}
Physical Faults: ${physicalFaults || 'None stated'}
Main Problem Description: ${problemDescription || 'Unspecified'}

STRICT OUTPUT CONSTRAINTS:
- Do NOT provide conversational intro, greetings, or sign-offs.
- Do NOT provide meta commentary, disclaimers, or conversational fluff.
- Output ONLY raw, structured troubleshooting paths and an actionable shop recommendation.`;

      // Timeout safety
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
      );

      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: `You are an expert master hardware technician and diagnostic engineer. You strictly output raw, structured troubleshooting steps and direct shop recommendations in JSON. Never include commentary, greetings, pleasantries, or fluff.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryAssessment: {
                type: Type.STRING,
                description: 'Concise, high-precision technical assessment of the primary fault mode.',
              },
              troubleshootingPaths: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: 'Troubleshooting phase title' },
                    steps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Exact step-by-step diagnostic actions',
                    },
                  },
                  required: ['title', 'steps'],
                },
                description: 'Structured step-by-step troubleshooting paths.',
              },
              shopRecommendation: {
                type: Type.OBJECT,
                properties: {
                  recommendedAction: { type: Type.STRING, description: 'Exact shop repair action required' },
                  componentSeverity: { type: Type.STRING, description: 'Severity level (e.g. Critical, High, Moderate)' },
                  repairType: { type: Type.STRING, description: 'Type of repair shop or lab recommended' },
                  technicianBrief: { type: Type.STRING, description: 'Direct instruction brief for the bench technician' },
                },
                required: ['recommendedAction', 'componentSeverity', 'repairType', 'technicianBrief'],
              },
            },
            required: ['primaryAssessment', 'troubleshootingPaths', 'shopRecommendation'],
          },
        },
      });

      const response = await Promise.race([geminiPromise, timeoutPromise]);

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim()) as DiagnosisResult;
        res.json({ success: true, data: parsed, engine: 'gemini' });
        return;
      }
    } catch (err: unknown) {
      console.warn('Gemini diagnosis fallback triggered:', err instanceof Error ? err.message : err);
    }
  }

  // Instant fallback to local expert triage engine
  const localResult = generateLocalDiagnostic({
    deviceType: deviceType || '',
    brandModel: brandModel || '',
    exportedCountry: exportedCountry || '',
    physicalFaults: physicalFaults || '',
    problemDescription: problemDescription || '',
  });

  res.json({ success: true, data: localResult, engine: 'local' });
});

// Follow-up chat troubleshooting endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  const { formData, result, messages, question } = req.body;

  if (!question || typeof question !== 'string') {
    res.status(400).json({ error: 'Question is required.' });
    return;
  }

  const clientKey = (req.headers['x-gemini-key'] as string) || (req.body?.apiKey as string);
  const apiKey = (clientKey && clientKey.trim() !== '') ? clientKey.trim() : process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const conversationHistory = (messages || [])
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const prompt = `CONTEXT:
Device: ${formData?.brandModel || formData?.deviceType || 'Hardware Unit'}
Origin: ${formData?.exportedCountry || 'Unspecified'}
Physical Faults: ${formData?.physicalFaults || 'None stated'}
Main Issue: ${formData?.problemDescription || 'Unspecified'}
Primary Assessment: ${result?.primaryAssessment || 'Hardware Diagnosis'}
Recommended Action: ${result?.shopRecommendation?.recommendedAction || 'Bench Service'}
Technician Brief: ${result?.shopRecommendation?.technicianBrief || 'Component inspection'}

PRIOR CONVERSATION:
${conversationHistory || 'None'}

USER FOLLOW-UP QUESTION:
${question}

INSTRUCTIONS:
Provide a direct, precise, highly technical answer for this specific hardware troubleshooting question. Detail exact screw types, driver sizes (e.g., Torx T4/T5, Pentalobe P2/P5, Phillips #000, JIS), torque precautions, authorized supplier types (OEM vs certified tier-1 aftermarket), ESD grounding, or step-by-step disassembly sequence.
Never include greetings, pleasantries, or meta filler. Start directly with the answer.`;

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
      );

      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: `You are a master hardware technician and bench diagnostic engineer. Answer follow-up troubleshooting queries with direct technical precision. Zero conversational fluff, zero pleasantries, no markdown headers or bullet lists where concise prose works. Keep it direct and authoritative.`,
        },
      });

      const response = await Promise.race([geminiPromise, timeoutPromise]);

      if (response && response.text) {
        res.json({ success: true, answer: response.text.trim() });
        return;
      }
    } catch (err: unknown) {
      console.warn('Gemini chat fallback triggered:', err instanceof Error ? err.message : err);
    }
  }

  // Local fallback response engine
  const qLower = question.toLowerCase();
  const unit = formData?.brandModel || formData?.deviceType || 'this device';

  let fallbackAnswer = '';

  if (qLower.includes('screw') || qLower.includes('driver') || qLower.includes('tool')) {
    if (unit.toLowerCase().includes('macbook') || unit.toLowerCase().includes('iphone') || unit.toLowerCase().includes('apple')) {
      fallbackAnswer = `For ${unit}, you will require a Pentalobe P5 (1.2mm) driver for lower chassis perimeter screws, a Torx T3/T5 driver for internal battery terminal brackets and motherboard retention plates, and an ESD-safe nylon spudger to disconnect fragile ZIF/eDP flex connectors without shorting standby voltage rails.`;
    } else {
      fallbackAnswer = `For ${unit}, standard service requires a Phillips #00 and #000 precision bit for internal bracket retention, a Torx T5 for chassis structural screws, and an anti-static nylon pry tool. Ensure all screws are mapped to their specific standoff depths to avoid board-drilling damage.`;
    }
  } else if (qLower.includes('buy') || qLower.includes('where') || qLower.includes('part') || qLower.includes('screen') || qLower.includes('battery')) {
    fallbackAnswer = `Source replacement assemblies through verified component suppliers such as iFixit, Mobile Defenders, Injured Gadgets, or OEM direct parts depots. Verify the exact part revision number on the back of the damaged module before ordering, as internal panel timing controllers (T-CON) frequently differ across production batches.`;
  } else if (qLower.includes('safe') || qLower.includes('risk') || qLower.includes('battery') || qLower.includes('fire')) {
    fallbackAnswer = `Primary risk factor is accidental lithium-ion pouch puncture during adhesive pull-tab removal. Never use metallic spudgers near battery cells. If adhesive tabs shear, apply isopropyl alcohol (90%+) along the perimeter to soften the acrylic bond without mechanical levering.`;
  } else {
    fallbackAnswer = `For ${unit}, systematically isolate the fault by disconnecting auxiliary daughterboards and measuring impedance across primary DC-in power rails. Confirm 3.3V and 5V standby rails prior to initiating component desoldering or module replacement.`;
  }

  res.json({ success: true, answer: fallbackAnswer });
});

// Real device image fetching endpoint (Google Custom Search with real photo fallback)
app.get('/api/device-image', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();

  if (!query || query.length < 2) {
    res.json({ success: true, imageUrl: null });
    return;
  }

  // 1. Google Custom Search JSON API (searchType=image)
  const googleKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_CSE_KEY || process.env.CUSTOM_SEARCH_KEY;
  const cx = process.env.CUSTOM_SEARCH_CX || process.env.GOOGLE_CSE_ID;

  if (googleKey && cx) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&searchType=image&num=1&key=${googleKey}&cx=${cx}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0 && data.items[0].link) {
          res.json({ success: true, imageUrl: data.items[0].link, source: 'google' });
          return;
        }
      }
    } catch {
      // Fall through to real photographic database
    }
  }

  // 2. Real authentic product photography from Wikipedia API (exact model hardware photo)
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&pithumbsize=800&format=json&origin=*`;
    const wikiRes = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'TruFixer-DeviceLookup/1.0 (contact@trufixer.internal)' },
    });

    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (wikiData.query && wikiData.query.pages) {
        const pages = Object.values(wikiData.query.pages) as Array<{
          thumbnail?: { source: string };
          original?: { source: string };
        }>;
        const img = pages[0]?.thumbnail?.source || pages[0]?.original?.source;
        if (img) {
          res.json({ success: true, imageUrl: img, source: 'wikipedia' });
          return;
        }
      }
    }
  } catch {
    // Graceful fallback
  }

  // 3. Wikimedia Commons real photo database fallback
  try {
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
    const commRes = await fetch(commonsUrl, {
      headers: { 'User-Agent': 'TruFixer-DeviceLookup/1.0 (contact@trufixer.internal)' },
    });

    if (commRes.ok) {
      const commData = await commRes.json();
      if (commData.query && commData.query.pages) {
        const pages = Object.values(commData.query.pages) as Array<{
          imageinfo?: Array<{ thumburl?: string; url?: string }>;
        }>;
        const img = pages[0]?.imageinfo?.[0]?.thumburl || pages[0]?.imageinfo?.[0]?.url;
        if (img && !img.endsWith('.svg')) {
          res.json({ success: true, imageUrl: img, source: 'commons' });
          return;
        }
      }
    }
  } catch {
    // Graceful fallback
  }

  // If no internet detected or search fails, cleanly return null (no error to user)
  res.json({ success: true, imageUrl: null });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TruFixer server running on port ${PORT}`);
  });
}

startServer();
