import type { Motif } from "./types";

/**
 * All thirty-six, in the order the Government of India lists them: the
 * twenty-eight states, then the eight union territories.
 *
 * See ./types.ts for the rules every one of these was drawn under.
 */
export const MOTIFS: Motif[] = [
  {
    region: "Andhra Pradesh",
    code: "AP",
    tradition: "Machilipatnam kalamkari",
    community: "Kalamkari printing families of Pedana and Machilipatnam, Krishna district",
    gi: "GI-registered 2008",
    shows: "A tree of life: a rocky mound, a stem that doubles back in shallow S-bends, and six branches ending in block-printed flowers",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
<path d="M28 92q6-8 12 0 6-8 12 0 6-8 12 0 6-8 8 0"/>
<path d="M50 88q-6-14 2-22 8-8 0-16 -8-8 2-16 8-6 2-12"/>
<path d="M50 74q-10-2-15-9M50 60q10-2 15-9M50 46q-10-2-15-9M50 34q10-1 14-7"/>
<circle cx="33" cy="63" r="5"/><circle cx="67" cy="49" r="5"/>
<circle cx="33" cy="35" r="4.5"/><circle cx="65" cy="25" r="4.5"/>
<path fill="currentColor" stroke="none" d="M33 61.5h3v3h-3zM67 47.5h3v3h-3zM33 33.5h3v3h-3zM65 23.5h3v3h-3z"/>
<path d="M50 22q-7-4-8-11M50 22q7-4 8-11"/>
<circle cx="50" cy="14" r="6"/>
</g>`,
  },
  {
    region: "Arunachal Pradesh",
    code: "AR",
    tradition: "Apatani weaving of the Ziro valley, worked on the chichin loin loom",
    community: "Apatani women weavers of the Ziro valley, Lower Subansiri",
    gi: "Apatani textile GI-registered 2013",
    shows: "Ruled horizontal bands with open lozenges between them — the loin loom admits no curve, so there is none here",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path fill="currentColor" stroke="none" d="M0 6h100v12H0zM0 82h100v12H0z"/>
<path stroke-width="1.5" d="M0 23h100M0 77h100"/>
<path d="M12 50l9-9 9 9-9 9zM41 50l9-9 9 9-9 9zM70 50l9-9 9 9-9 9z"/>
<path stroke-width="1.5" d="M0 33h100M0 67h100"/>
<path fill="currentColor" stroke="none" d="M4 47.5h5v5H4zM91 47.5h5v5h-5zM33 47.5h4v5h-4zM63 47.5h4v5h-4z"/>
</g>`,
  },
  {
    region: "Assam",
    code: "AS",
    tradition: "Phulam gamosa weaving",
    community: "Assamese household weavers of the Brahmaputra valley and Sualkuchi, Kamrup",
    gi: "Assam Gamosa GI-tagged 2022",
    shows: "A supplementary-weft border band: three stepped japi — the farmer's conical sun hat — alternating with small stepped trees",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path stroke-width="3" d="M0 28h100M0 72h100"/>
<path stroke-width="1.5" d="M0 34h100M0 66h100"/>
<path d="M12.5 61v-6h2.5v-6h2.5v-6h5v6h2.5v6h2.5v6zM42.5 61v-6h2.5v-6h2.5v-6h5v6h2.5v6h2.5v6zM72.5 61v-6h2.5v-6h2.5v-6h5v6h2.5v6h2.5v6z"/>
<path d="M35 61V42M35 57h-4.5v-4M35 57h4.5v-4M35 51h-3.5v-3.5M35 51h3.5v-3.5M35 46h-2v-2.5M35 46h2v-2.5M65 61V42M65 57h-4.5v-4M65 57h4.5v-4M65 51h-3.5v-3.5M65 51h3.5v-3.5M65 46h-2v-2.5M65 46h2v-2.5"/>
<path fill="currentColor" stroke="none" d="M18 39h4v4h-4zM48 39h4v4h-4zM78 39h4v4h-4zM33.5 39h3v3h-3zM63.5 39h3v3h-3z"/>
</g>`,
  },
  {
    region: "Bihar",
    code: "BR",
    tradition: "Mithila painting (Madhubani)",
    community: "Maithil women painters of Madhubani and Darbhanga",
    gi: "Madhubani painting GI-registered 2007",
    shows: "Two fish crossing inside a double border — a Mithila good-fortune motif, drawn with the tradition's doubled outline and packed infill",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
<rect x="5" y="5" width="90" height="90"/><rect x="13" y="13" width="74" height="74" stroke-width="1.5"/>
<path stroke-width="1.5" d="M9 9h4M25 5v8M45 5v8M65 5v8M85 5v8M25 87v8M45 87v8M65 87v8M85 87v8M5 25h8M5 45h8M5 65h8M5 85h8M87 25h8M87 45h8M87 65h8M87 85h8"/>
<path d="M22 40q18-14 40-4 12 6 18 14-16 10-34 6-16-4-24-16z"/>
<path d="M26 41.5q17-12 37-3 11 5 16 12"/>
<path d="M22 40l-6-7 2 10-6 3 9 2M80 50l7 6-9 1 1 7-8-6"/>
<circle cx="34" cy="40" r="1.8" fill="currentColor" stroke="none"/>
<path stroke-width="1.5" d="M38 34q3 8 1 15M48 33q3 9 1 16M58 35q3 8 1 14M68 40q3 7 1 12"/>
<path d="M78 64q-18 14-40 4-12-6-18-14 16-10 34-6 16 4 24 16z"/>
<path d="M74 62.5q-17 12-37 3-11-5-16-12"/>
<path d="M78 64l6 7-2-10 6-3-9-2M20 54l-7-6 9-1-1-7 8 6"/>
<circle cx="66" cy="64" r="1.8" fill="currentColor" stroke="none"/>
<path stroke-width="1.5" d="M62 70q-3-8-1-15M52 71q-3-9-1-16M42 69q-3-8-1-14M32 64q-3-7-1-12"/>
</g>`,
  },
  {
    region: "Chhattisgarh",
    code: "CG",
    tradition: "Bastar dhokra and wrought-iron craft",
    community: "Lohar and Ghadwa metalsmiths of Bastar and Kondagaon",
    gi: "Bastar iron craft GI-registered 2008",
    shows: "A wrought-iron lamp tree: one beaten stem carrying three tiers of right-angled arms, each ending in a lamp cup",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square">
<path d="M50 92V14"/>
<path d="M38 92h24M42 88h16"/>
<path d="M50 70h-16v-7M50 70h16v-7M50 50h-21v-7M50 50h21v-7M50 32h-13v-6M50 32h13v-6"/>
<path d="M29 63q0-5 5-5t5 5zM61 63q0-5 5-5t5 5zM24 43q0-5 5-5t5 5zM66 43q0-5 5-5t5 5zM32 26q0-4.5 5-4.5t5 4.5zM58 26q0-4.5 5-4.5t5 4.5z"/>
<path d="M50 14l-6 6h12z" fill="currentColor" stroke="none"/>
<path d="M44 8q6-6 12 0-6 5-12 0z"/>
</g>`,
  },
  {
    region: "Goa",
    code: "GA",
    tradition: "Kaavi kalé, the cut red-laterite plaster relief of Goan and Konkan wall work",
    community: "Konkan plaster artisans of Goa and the coastal Karnataka border",
    shows: "A cut-plaster band: paired rules with a run of half-discs beneath and a lotus-scroll register between",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path d="M8 16h84M8 84h84"/>
<path fill="currentColor" stroke="none" d="M12 16a4 4 0 008 0zM26 16a4 4 0 008 0zM40 16a4 4 0 008 0zM54 16a4 4 0 008 0zM68 16a4 4 0 008 0zM82 16a4 4 0 008 0zM12 84a4 4 0 018 0zM26 84a4 4 0 018 0zM40 84a4 4 0 018 0zM54 84a4 4 0 018 0zM68 84a4 4 0 018 0zM82 84a4 4 0 018 0z"/>
<path stroke-width="1.5" d="M8 26h84M8 74h84"/>
<path d="M14 50q9-16 18 0 9 16 18 0 9-16 18 0 9 16 18 0"/>
<path d="M14 50q9 16 18 0M50 50q9 16 18 0"/>
<circle cx="32" cy="50" r="3.5" fill="currentColor" stroke="none"/>
<circle cx="68" cy="50" r="3.5" fill="currentColor" stroke="none"/>
<path d="M8 34v32M92 34v32"/>
</g>`,
  },
  {
    region: "Gujarat",
    code: "GJ",
    tradition: "Kachchh Ajrakh block printing",
    community: "Khatri block-printing families of Ajrakhpur and Dhamadka, Kachchh",
    gi: "Kachchh Ajrakh GI-registered 2011",
    shows: "One repeat of an Ajrakh tile — an eight-pointed star on a grid that visibly continues past its own edges",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path d="M50 24l18 8 8 18-8 18-18 8-18-8-8-18 8-18z"/>
<path d="M24 50h52M50 24v52M31.5 31.5l37 37M68.5 31.5l-37 37"/>
<path fill="currentColor" stroke="none" d="M50 43l7 7-7 7-7-7z"/>
<path stroke-width="1.5" d="M0 0l24 24M100 0L76 24M0 100l24-24M100 100L76 76"/>
<path d="M0 12h12V0M88 0v12h12M0 88h12v12M88 100V88h12"/>
<circle cx="12" cy="12" r="4"/><circle cx="88" cy="12" r="4"/>
<circle cx="12" cy="88" r="4"/><circle cx="88" cy="88" r="4"/>
<path stroke-width="1.5" d="M50 0v12M50 88v12M0 50h12M88 50h12"/>
</g>`,
  },
  {
    region: "Haryana",
    code: "HR",
    tradition: "Khes flat-weave of the Haryana plains",
    community: "Handloom weaving households of Panipat, Rohtak and Sonipat",
    shows: "Khes banding — a chequer row, plain rules, and a stepped diagonal register, every diagonal made of square steps",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path fill="currentColor" stroke="none" d="M0 10h10v12H0zM20 10h10v12H20zM40 10h10v12H40zM60 10h10v12H60zM80 10h10v12H80z"/>
<path d="M0 10h100M0 22h100"/>
<path fill="currentColor" stroke="none" d="M0 27h100v5H0z"/>
<path d="M5 62v-5h5v-5h5v-5h5v-5h5v5h5v5h5v5h5v5M55 62v-5h5v-5h5v-5h5v-5h5v5h5v5h5v5h5v5"/>
<path stroke-width="1.5" d="M0 40h100M0 68h100"/>
<path fill="currentColor" stroke="none" d="M0 76h100v5H0z"/>
<path fill="currentColor" stroke="none" d="M10 86h10v12H10zM30 86h10v12H30zM50 86h10v12H50zM70 86h10v12H70zM90 86h10v12H90z"/>
<path d="M0 86h100M0 98h100"/>
</g>`,
  },
  {
    region: "Himachal Pradesh",
    code: "HP",
    tradition: "Chamba rumal, the double-satin-stitch embroidered coverlet",
    community: "Embroiderers of Chamba town and the Ravi valley",
    gi: "Chamba Rumal GI-registered 2007",
    shows: "The rumal's doubled rule and its border vine of rosettes and paired leaves, with a chinar-leaf corner",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<rect x="6" y="6" width="88" height="88"/>
<rect x="11" y="11" width="78" height="78" stroke-width="1.2"/>
<rect x="20" y="20" width="60" height="60" stroke-width="1.2"/>
<path stroke-width="1.8" d="M20 15h60M20 85h60M15 20v60M85 20v60"/>
<circle cx="32" cy="15" r="3"/><circle cx="50" cy="15" r="3"/><circle cx="68" cy="15" r="3"/>
<circle cx="32" cy="85" r="3"/><circle cx="50" cy="85" r="3"/><circle cx="68" cy="85" r="3"/>
<circle cx="15" cy="32" r="3"/><circle cx="15" cy="50" r="3"/><circle cx="15" cy="68" r="3"/>
<circle cx="85" cy="32" r="3"/><circle cx="85" cy="50" r="3"/><circle cx="85" cy="68" r="3"/>
<path stroke-width="1.5" d="M41 15q0-4 4-4M41 15q0 4 4 4M59 15q0-4-4-4M59 15q0 4-4 4M41 85q0-4 4-4M41 85q0 4 4 4M59 85q0-4-4-4M59 85q0 4-4 4"/>
<path d="M50 68q-9-6-9-16 0-7 5-11-3-6 4-9 7 3 4 9 5 4 5 11 0 10-9 16z"/>
<path d="M50 68V38"/>
<path stroke-width="1.5" d="M50 52l-7-5M50 52l7-5M50 45l-5-4M50 45l5-4"/>
</g>`,
  },
  {
    region: "Jharkhand",
    code: "JH",
    tradition: "Sohrai and Khovar mural painting of the Hazaribagh plateau",
    community: "Kurmi, Santal, Munda, Oraon and Ganju women muralists of Hazaribagh",
    gi: "Sohrai Khovar painting GI-registered 2020",
    shows: "A Sohrai harvest bull in heavy outline, its body divided into compartments by comb-drawn bands",
    svg: `<g fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round">
<path d="M20 74V52q0-9 9-9h34q9 0 9 9v22"/>
<path d="M20 74v14M32 74v10M60 74v10M72 74v14"/>
<path d="M72 52q6-4 11-2 5 2 4 8-1 5-7 5-5 0-8-4"/>
<path d="M80 46q-2-8 3-12M80 46q6-6 12-4"/>
<circle cx="82" cy="56" r="1.8" fill="currentColor" stroke="none"/>
<path d="M20 56q-8 2-10 8"/>
<path stroke-width="2" d="M35 43v31M37.5 43v31M40 43v31M53 43v31M55.5 43v31M58 43v31"/>
<path stroke-width="2" d="M0 22h100M0 28h100M0 34h100"/>
<path stroke-width="2" d="M6 22v-8M18 22v-8M30 22v-8M42 22v-8M54 22v-8M66 22v-8M78 22v-8M90 22v-8"/>
<path stroke-width="2" d="M0 94h100M0 100h100"/>
</g>`,
  },
  {
    region: "Karnataka",
    code: "KA",
    tradition: "Kasuti embroidery",
    community: "Kasuti embroiderers of north Karnataka — Dharwad, Hubballi and Bijapur",
    gi: "Kasuti GI-registered 2006",
    shows: "A stepped-diamond gopura medallion, every point snapped to the counted-thread grid Kasuti is worked on",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="miter">
<path d="M50 20l5 5h5v5h5v5h5v5h5v5h5v5l-5 5h-5v5h-5v5h-5v5h-5v5l-5 5-5-5v-5h-5v-5h-5v-5h-5v-5h-5v-5l-5-5v-5h5v-5h5v-5h5v-5h5v-5h5v-5z"/>
<path d="M50 32l5 5h5v5h5v5h5v3l-5 5h-5v5h-5v5h-5v5l-5 5-5-5v-5h-5v-5h-5v-5h-5v-3l-5-5v-5h5v-5h5v-5h5v-5h5z"/>
<path fill="currentColor" stroke="none" d="M45 45h10v10H45z"/>
<path stroke-width="1.5" d="M50 5v10M50 85v10M5 50h10M85 50h10"/>
<path fill="currentColor" stroke="none" d="M2 47h6v6H2zM92 47h6v6h-6zM47 2h6v6h-6zM47 92h6v6h-6z"/>
</g>`,
  },
  {
    region: "Kerala",
    code: "KL",
    tradition: "Screw pine (kaitha) mat plaiting",
    community: "Screw-pine weavers of Killimangalam and the Alappuzha backwaters",
    gi: "Screw Pine Craft of Kerala GI-registered 2010",
    shows: "The plait itself — ribbon edges crossing at 45 degrees with the over-two, under-one break drawn as gaps",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square">
<path d="M-6 22L22 -6M-6 42L42 -6M-6 62L62 -6M-6 82L82 -6M2 98L98 2M18 106L106 18M38 106L106 38M58 106L106 58M78 106L106 78"/>
<path d="M-6 78L78 106M-6 58L58 106M-6 38L38 106M-6 18L18 106M2 2L98 98M18 -6L106 82M38 -6L106 62M58 -6L106 42M78 -6L106 22"/>
<path stroke="var(--paper, #ffffeb)" stroke-width="7" d="M14 6L34 26M54 6L74 26M14 46L34 66M54 46L74 66M34 26L14 46M74 26L54 46M34 66L14 86M74 66L54 86"/>
<path d="M0 0h100v100H0z" stroke-width="3"/>
</g>`,
  },
  {
    region: "Madhya Pradesh",
    code: "MP",
    tradition: "Gond painting of the Patangarh–Dindori belt",
    community: "Pardhan Gond painters of Dindori and Mandla districts",
    gi: "Gond Painting GI-registered 2023",
    shows: "A mahua tree in flower with two birds — drawn as a single even-weight outline packed with a repeated dash, the way Gond work is built",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
<path d="M46 92q0-24 4-32 4 8 4 32z"/>
<path stroke-width="1.5" d="M48 84h4M48 76h4M48 68h4M49 60h2"/>
<path d="M50 60q-10-4-14-14-4-10 4-16M50 60q10-4 14-14 4-10-4-16"/>
<path d="M40 30q-8-4-6-12M60 30q8-4 6-12"/>
<path stroke-width="1.5" d="M44 54l-3 3M40 46l-4 2M39 37l-4 1M56 54l3 3M60 46l4 2M61 37l4 1"/>
<circle cx="34" cy="18" r="5"/><circle cx="66" cy="18" r="5"/>
<path d="M50 44q-8-2-11-8M50 44q8-2 11-8"/>
<path d="M30 62q6-6 12-2 5 3 2 8-4 6-10 2-5-3-4-8z"/>
<path stroke-width="1.5" d="M33 62h9M34 66h7M35 58h6"/>
<circle cx="34" cy="61" r="1.4" fill="currentColor" stroke="none"/>
<path d="M70 62q-6-6-12-2-5 3-2 8 4 6 10 2 5-3 4-8z"/>
<path stroke-width="1.5" d="M58 62h9M59 66h7M60 58h6"/>
<circle cx="66" cy="61" r="1.4" fill="currentColor" stroke="none"/>
</g>`,
  },
  {
    region: "Maharashtra",
    code: "MH",
    tradition: "Warli painting",
    community: "Warli Adivasi painters of Palghar and the Dahanu–Jawhar belt",
    gi: "Warli Painting GI-registered 2014",
    shows: "The tarpa dance — the piper at the centre and the chain of dancers circling, drawn as the tradition draws people: two triangles and a line",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
<path d="M50 42l-5 8h10zM50 58l-5-8h10z"/>
<circle cx="50" cy="38" r="3.5"/>
<path d="M50 58v8M50 66l-4 8M50 66l4 8"/>
<path d="M53 48l10 6q4 3 1 7"/>
<circle cx="62" cy="60" r="4"/>
<circle cx="50" cy="50" r="30" stroke-width="1.5" stroke-dasharray="2 5"/>
<g>
<path d="M50 6l-4 7h8zM50 20l-4-7h8z"/><circle cx="50" cy="3" r="2.6"/><path d="M50 20v5M50 25l-3 6M50 25l3 6M47 13l-9 4M53 13l9 4"/>
</g>
<g>
<path d="M87 32l-7.5 2.5 4 7zM75 40l7.5-2.5-4-7z"/><circle cx="89" cy="30" r="2.6"/><path d="M75 40l-4 3M71 43l1 6M71 43l-6 1M79 34l-8-5M83 39l3 9"/>
</g>
<g>
<path d="M87 68l-3.5-7-4 7zM75 60l3.5 7 4-7z"/><circle cx="89" cy="70" r="2.6"/><path d="M75 60l-5-1M70 59l-4 5M70 59l1-6M79 67l-9 4M83 61l4-9"/>
</g>
<g>
<path d="M50 94l-4-7h8zM50 80l-4 7h8z"/><circle cx="50" cy="97" r="2.6"/><path d="M50 80v-5M50 75l-3-6M50 75l3-6M47 87l-9-4M53 87l9-4"/>
</g>
<g>
<path d="M13 68l7.5-2.5-4-7zM25 60l-7.5 2.5 4 7z"/><circle cx="11" cy="70" r="2.6"/><path d="M25 60l4-3M29 57l-1-6M29 57l6-1M21 66l8 5M17 61l-3-9"/>
</g>
<g>
<path d="M13 32l3.5 7 4-7zM25 40l-3.5-7-4 7z"/><circle cx="11" cy="30" r="2.6"/><path d="M25 40l5 1M30 41l4-5M30 41l-1 6M21 33l9-4M17 39l-4 9"/>
</g>
</g>`,
  },
  {
    region: "Manipur",
    code: "MN",
    tradition: "Moirang Pheejin border geometry, woven on Wangkhei Phee",
    community: "Meitei handloom weavers of the Imphal valley",
    gi: "Moirang Phee and Wangkhei Phee GI-registered 2011",
    shows: "The interlocking stepped pyramids of the Moirang Pheejin border, meeting from both edges",
    svg: `<g fill="currentColor">
<path d="M11 100v-4.5h2v-4.5h2v-4.5h2v-4.5h2v-4.5h2v4.5h2v4.5h2v4.5h2v4.5h2v4.5zM41 100v-4.5h2v-4.5h2v-4.5h2v-4.5h2v-4.5h2v4.5h2v4.5h2v4.5h2v4.5h2v4.5zM71 100v-4.5h2v-4.5h2v-4.5h2v-4.5h2v-4.5h2v4.5h2v4.5h2v4.5h2v4.5h2v4.5z"/>
<path d="M-4 0v4.5h2v4.5h2v4.5h2v4.5h2v4.5h2v-4.5h2v-4.5h2v-4.5h2v-4.5h2v-4.5zM26 0v4.5h2v4.5h2v4.5h2v4.5h2v4.5h2v-4.5h2v-4.5h2v-4.5h2v-4.5h2v-4.5zM56 0v4.5h2v4.5h2v4.5h2v4.5h2v4.5h2v-4.5h2v-4.5h2v-4.5h2v-4.5h2v-4.5zM86 0v4.5h2v4.5h2v4.5h2v4.5h2v4.5h2v-4.5h2v-4.5h2v-4.5h2v-4.5h2v-4.5z"/>
<path fill="none" stroke="currentColor" stroke-width="1.5" d="M0 34h100M0 44h100M0 56h100M0 66h100"/>
<path d="M28 47.5h5v5h-5zM67 47.5h5v5h-5z"/>
</g>`,
  },
  {
    region: "Meghalaya",
    code: "ML",
    tradition: "Khneng border embroidery",
    community: "Khasi weavers and embroiderers of Mustoh, East Khasi Hills",
    gi: "Worked on GI-tagged Ryndia and Khasi Handloom, 2025",
    shows: "The khneng's three-register border — two rails, the cross-ticks between them, and the fringe above and below",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path stroke-width="4" d="M0 44h100M0 56h100"/>
<path d="M7 44v12M19 44v12M31 44v12M43 44v12M55 44v12M67 44v12M79 44v12M91 44v12"/>
<path d="M1 34v10M1 56v10M7 34v10M7 56v10M13 34v10M13 56v10M19 34v10M19 56v10M25 34v10M25 56v10M31 34v10M31 56v10M37 34v10M37 56v10M43 34v10M43 56v10M49 34v10M49 56v10M55 34v10M55 56v10M61 34v10M61 56v10M67 34v10M67 56v10M73 34v10M73 56v10M79 34v10M79 56v10M85 34v10M85 56v10M91 34v10M91 56v10M97 34v10M97 56v10"/>
<path fill="currentColor" stroke="none" d="M11 48h4v4h-4zM35 48h4v4h-4zM59 48h4v4h-4zM83 48h4v4h-4z"/>
</g>`,
  },
  {
    region: "Mizoram",
    code: "MZ",
    tradition: "Mizo puan handloom weaving, in the Puanchei pattern",
    community: "Mizo women weavers on the loin loom, across Aizawl and Thenzawl",
    gi: "Mizo Puanchei GI-registered 2019",
    shows: "A patch of puanchei read square-on — unequal stripes off centre, crossed by the pattern bands",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path fill="currentColor" stroke="none" d="M0 0h14v100H0zM40 0h20v100H40zM86 0h14v100H86z"/>
<path d="M18 0v100M36 0v100M64 0v100M82 0v100"/>
<path stroke-width="3" d="M0 20h100M0 50h100M0 80h100"/>
<path d="M20 20l4-6 4 6-4 6zM66 20l4-6 4 6-4 6zM20 50l4-6 4 6-4 6zM66 50l4-6 4 6-4 6zM20 80l4-6 4 6-4 6zM66 80l4-6 4 6-4 6z"/>
<path stroke-width="1.5" d="M18 12h18M64 12h18M18 62h18M64 62h18"/>
<path fill="currentColor" stroke="none" d="M44 18h12v4H44zM44 48h12v4H44zM44 78h12v4H44z"/>
</g>`,
  },
  {
    region: "Nagaland",
    code: "NL",
    tradition: "Chakhesang Naga loin-loom weaving",
    community: "Chakhesang women weavers of Phek district",
    gi: "Chakhesang shawl GI-registered 2017",
    shows: "A fragment of loin-loom cloth: marginal rule clusters top and bottom, and a central band of counted lozenges",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path d="M0 6h100M0 12h100M0 18h100M0 24h100"/>
<path stroke-width="1" d="M0 9h100M0 15h100M0 21h100"/>
<path d="M0 76h100M0 82h100M0 88h100M0 94h100"/>
<path stroke-width="1" d="M0 79h100M0 85h100M0 91h100"/>
<path stroke-width="4" d="M0 36h100M0 64h100"/>
<path d="M10 50l8-8 8 8-8 8zM42 50l8-8 8 8-8 8zM74 50l8-8 8 8-8 8z"/>
<path fill="currentColor" stroke="none" d="M15 47h6v6h-6zM47 47h6v6h-6zM79 47h6v6h-6z"/>
<path d="M31 42v16M67 42v16"/>
<path fill="currentColor" stroke="none" d="M0 42h4v16H0zM96 42h4v16h-4z"/>
</g>`,
  },
  {
    region: "Odisha",
    code: "OD",
    tradition: "Odisha Pattachitra",
    community: "Chitrakar painting families of Raghurajpur and Danda Sahi, Puri",
    gi: "Odisha Pattachitra GI-registered 2008",
    shows: "The pattachitra's own frame — nested rules with a running lotus-petal channel, which is what carries the identity of the form",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<rect x="4" y="4" width="92" height="92"/>
<rect x="10" y="10" width="80" height="80" stroke-width="2"/>
<rect x="22" y="22" width="56" height="56" stroke-width="2"/>
<path stroke-width="1.5" d="M16 10v12M28 10v12M40 10v12M52 10v12M64 10v12M76 10v12M16 78v12M28 78v12M40 78v12M52 78v12M64 78v12M76 78v12M10 16h12M10 28h12M10 40h12M10 52h12M10 64h12M10 76h12M78 16h12M78 28h12M78 40h12M78 52h12M78 64h12M78 76h12"/>
<path d="M50 30q-11 8-11 20 0 12 11 20 11-8 11-20 0-12-11-20z"/>
<path d="M50 30v40M39 50h22"/>
<path stroke-width="1.5" d="M44 38q6 4 12 0M44 62q6-4 12 0"/>
<circle cx="50" cy="50" r="4" fill="currentColor" stroke="none"/>
</g>`,
  },
  {
    region: "Punjab",
    code: "PB",
    tradition: "Phulkari and bagh darning embroidery",
    community: "Punjabi women embroiderers of the Malwa and Majha belts",
    gi: "Phulkari GI-registered 2011",
    shows: "A phulkari lozenge: nested diamonds whose darning runs reverse direction band by band, so the light changes across them",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path d="M50 12L88 50 50 88 12 50z"/>
<path d="M50 24L76 50 50 76 24 50z"/>
<path d="M50 36L64 50 50 64 36 50z"/>
<path stroke-width="1.6" d="M32 44l12-12M36 52l20-20M40 60l28-28M48 64l20-20M56 68l12-12"/>
<path stroke-width="1.6" d="M32 56l12 12M36 48l20 20M40 40l28 28M48 36l20 20M56 32l12 12"/>
<path fill="currentColor" stroke="none" d="M50 44l6 6-6 6-6-6z"/>
<path stroke-width="1.6" d="M0 4h100M0 96h100"/>
<path fill="currentColor" stroke="none" d="M6 0l6 8-6 8-6-8zM30 0l6 8-6 8-6-8zM54 0l6 8-6 8-6-8zM78 0l6 8-6 8-6-8zM18 92l6 8-6 8-6-8zM42 92l6 8-6 8-6-8zM66 92l6 8-6 8-6-8zM90 92l6 8-6 8-6-8z"/>
</g>`,
  },
  {
    region: "Rajasthan",
    code: "RJ",
    tradition: "Mandana, the ochre-and-chalk threshold and wall drawing",
    community: "Meena and Rajput women of the Hadoti and Sawai Madhopur belt",
    shows: "A threshold medallion drawn out from a centre point, inside a saw-tooth border — as it is laid on a swept floor",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
<rect x="5" y="5" width="90" height="90"/>
<rect x="13" y="13" width="74" height="74" stroke-width="1.5"/>
<path stroke-width="1.5" d="M5 9l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4M5 91l4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4"/>
<path d="M50 22L78 50 50 78 22 50z"/>
<path d="M50 32L68 50 50 68 32 50z"/>
<path d="M50 22v-8M50 78v8M22 50h-8M78 50h8"/>
<path d="M30.5 30.5l-6-6M69.5 30.5l6-6M30.5 69.5l-6 6M69.5 69.5l6 6"/>
<circle cx="50" cy="50" r="7"/>
<circle cx="50" cy="50" r="2.5" fill="currentColor" stroke="none"/>
<circle cx="50" cy="18" r="2.5" fill="currentColor" stroke="none"/>
<circle cx="50" cy="82" r="2.5" fill="currentColor" stroke="none"/>
<circle cx="18" cy="50" r="2.5" fill="currentColor" stroke="none"/>
<circle cx="82" cy="50" r="2.5" fill="currentColor" stroke="none"/>
</g>`,
  },
  {
    region: "Sikkim",
    code: "SK",
    tradition: "Lepcha thara backstrap-loom weaving of Dzongu",
    community: "Lepcha weavers of Dzongu, North Sikkim",
    shows: "Thara cloth read edge to edge — vertical bands of deliberately unequal width between two selvedge rules",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path stroke-width="3" d="M6 0v100M94 0v100"/>
<path fill="currentColor" stroke="none" d="M14 0h6v100h-6zM36 0h8v100h-8zM64 0h8v100h-8zM80 0h6v100h-6z"/>
<path d="M28 0v100M56 0v100"/>
<path stroke-width="1.5" d="M24 0v100M32 0v100M52 0v100M60 0v100M76 0v100"/>
<path stroke-width="3" d="M6 26h88M6 74h88"/>
<path d="M6 32h88M6 68h88" stroke-width="1.5"/>
<path fill="currentColor" stroke="none" d="M6 46h88v8H6z"/>
<path stroke="var(--paper, #ffffeb)" stroke-width="2.5" d="M16 46v8M30 46v8M44 46v8M58 46v8M72 46v8M86 46v8"/>
</g>`,
  },
  {
    region: "Tamil Nadu",
    code: "TN",
    tradition: "Toda embroidery (pukhoor)",
    community: "Toda women embroiderers of the Nilgiri hills",
    gi: "Toda Embroidery GI-registered 2013",
    shows: "A Toda band sampler — built only from horizontals, verticals and exact diagonals, because the stitch counts threads",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path stroke-width="3" d="M0 20h100M0 80h100"/>
<path stroke-width="1.5" d="M0 26h100M0 74h100"/>
<path d="M8 62V38h8v12h8V38h8v24h8V38h8v12h8V38h8v24h8V38h8v12h8V38h8v24"/>
<path fill="currentColor" stroke="none" d="M10 44h4v4h-4zM26 52h4v4h-4zM42 44h4v4h-4zM58 52h4v4h-4zM74 44h4v4h-4zM90 52h4v4h-4z"/>
<path stroke-width="2" d="M0 10h100M0 90h100"/>
<path stroke-width="2" d="M4 10l5-5 5 5M20 10l5-5 5 5M36 10l5-5 5 5M52 10l5-5 5 5M68 10l5-5 5 5M84 10l5-5 5 5M4 90l5 5 5-5M20 90l5 5 5-5M36 90l5 5 5-5M52 90l5 5 5-5M68 90l5 5 5-5M84 90l5 5 5-5"/>
</g>`,
  },
  {
    region: "Telangana",
    code: "TS",
    tradition: "Cheriyal scroll painting",
    community: "Nakashi scroll-painting families of Cheriyal, Siddipet district",
    gi: "Cheriyal Paintings GI-registered 2007",
    shows: "One register of a Cheriyal scroll — a working scene between the creeper rules that divide every panel from the next",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path stroke-width="3" d="M0 26h100M0 74h100"/>
<path d="M2 20q6-10 12 0 6 10 12 0 6-10 12 0 6 10 12 0 6-10 12 0 6 10 12 0 6-10 12 0M2 80q6 10 12 0 6-10 12 0 6 10 12 0 6-10 12 0 6 10 12 0 6-10 12 0 6 10 12 0"/>
<circle cx="30" cy="52" r="7"/>
<path d="M30 59v12M30 63l-8 5M30 63l8 5M30 71l-5 9M30 71l5 9"/>
<circle cx="66" cy="52" r="7"/>
<path d="M66 59v12M66 63l-8 5M66 63l8 5M66 71l-5 9M66 71l5 9"/>
<path d="M38 68h20" stroke-width="3"/>
<path stroke-width="1.5" d="M14 40v22M86 40v22M12 40h4M84 40h4"/>
<path fill="currentColor" stroke="none" d="M46 44h8v6h-8z"/>
</g>`,
  },
  {
    region: "Tripura",
    code: "TR",
    tradition: "Risa and rignai-pachra loin-loom weaving",
    community: "Tripuri (Borok) women weavers and the Gomati district weaving clusters",
    gi: "Risa and Rignai Pachra GI-tagged 2024",
    shows: "Risa cloth filled edge to edge — unequal warp stripes crossed by registers of counted diamonds",
    svg: `<g fill="none" stroke="currentColor">
<path stroke-width="4" d="M50 0v100"/>
<path stroke-width="3" d="M0 0v100M100 0v100"/>
<path stroke-width="2.5" d="M0 0h100M0 50h100M0 100h100"/>
<path stroke-width="1.5" d="M26 0v100M74 0v100M0 25h100M0 75h100"/>
<path stroke-width="2" d="M4 12.5l4-4 4 4-4 4zM15 12.5l4-4 4 4-4 4zM28 12.5l4-4 4 4-4 4zM39 12.5l4-4 4 4-4 4zM53 12.5l4-4 4 4-4 4zM64 12.5l4-4 4 4-4 4zM77 12.5l4-4 4 4-4 4zM88 12.5l4-4 4 4-4 4zM4 41.5l4-4 4 4M4 37l4-4 4 4M15 41.5l4-4 4 4M15 37l4-4 4 4M28 41.5l4-4 4 4M28 37l4-4 4 4M39 41.5l4-4 4 4M39 37l4-4 4 4M53 41.5l4-4 4 4M53 37l4-4 4 4M64 41.5l4-4 4 4M64 37l4-4 4 4M77 41.5l4-4 4 4M77 37l4-4 4 4M88 41.5l4-4 4 4M88 37l4-4 4 4M4 83.5l4 4 4-4M4 88l4 4 4-4M15 83.5l4 4 4-4M15 88l4 4 4-4M28 83.5l4 4 4-4M28 88l4 4 4-4M39 83.5l4 4 4-4M39 88l4 4 4-4M53 83.5l4 4 4-4M53 88l4 4 4-4M64 83.5l4 4 4-4M64 88l4 4 4-4M77 83.5l4 4 4-4M77 88l4 4 4-4M88 83.5l4 4 4-4M88 88l4 4 4-4"/>
<path fill="currentColor" stroke="none" d="M4 62.5l4-4 4 4-4 4zM15 62.5l4-4 4 4-4 4zM28 62.5l4-4 4 4-4 4zM39 62.5l4-4 4 4-4 4zM53 62.5l4-4 4 4-4 4zM64 62.5l4-4 4 4-4 4zM77 62.5l4-4 4 4-4 4zM88 62.5l4-4 4 4-4 4z"/>
</g>`,
  },
  {
    region: "Uttar Pradesh",
    code: "UP",
    tradition: "Lucknow chikankari",
    community: "Chikan embroiderers of Lucknow and the Awadh districts",
    gi: "Lucknow Chikan Craft GI-registered 2008",
    shows: "A flowering buti rising across a jaali panel — the stem as running tepchi stitch, the leaves hollow-outlined in bakhiya",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<rect x="8" y="8" width="84" height="84" stroke-width="2"/>
<path stroke-width="0.9" d="M20 8v84M32 8v84M44 8v84M56 8v84M68 8v84M80 8v84M8 20h84M8 32h84M8 44h84M8 56h84M8 68h84M8 80h84"/>
<path stroke-width="2" stroke-dasharray="4 3" d="M24 86q6-22 18-34 10-10 14-24"/>
<path d="M34 62q-10-4-10-12 8-2 12 6 3 5-2 6z"/>
<path d="M46 46q10-4 10-12-8-2-12 6-3 5 2 6z"/>
<path d="M32 76q-11-3-12-11 9-3 14 5 3 5-2 6z"/>
<path stroke-width="1.2" d="M28 58l-3-4M40 48l4-4M26 72l-3-4"/>
<circle cx="58" cy="24" r="8"/>
<path d="M58 16v16M50 24h16M52.5 18.5l11 11M63.5 18.5l-11 11"/>
<circle cx="58" cy="24" r="2.5" fill="currentColor" stroke="none"/>
</g>`,
  },
  {
    region: "Uttarakhand",
    code: "UK",
    tradition: "Aipan, the rice-paste threshold drawing of Kumaon",
    community: "Kumaoni women of Almora, Nainital and the Kumaon hills",
    shows: "A chowki grown outward from a single dot — filled circle, rotated square, upright square, then a scalloped edge",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
<circle cx="50" cy="50" r="6" fill="currentColor" stroke="none"/>
<circle cx="50" cy="50" r="11"/>
<path d="M50 30l20 20-20 20-20-20z"/>
<rect x="22" y="22" width="56" height="56"/>
<path d="M50 12l38 38-38 38-38-38z"/>
<path d="M50 12q7 4 7 8M50 12q-7 4-7 8M88 50q-4 7-8 7M88 50q-4-7-8-7M50 88q7-4 7-8M50 88q-7-4-7-8M12 50q4 7 8 7M12 50q4-7 8-7"/>
<path stroke-width="1.5" d="M36 36l-8-8M64 36l8-8M36 64l-8 8M64 64l8 8"/>
<circle cx="26" cy="26" r="2.5" fill="currentColor" stroke="none"/>
<circle cx="74" cy="26" r="2.5" fill="currentColor" stroke="none"/>
<circle cx="26" cy="74" r="2.5" fill="currentColor" stroke="none"/>
<circle cx="74" cy="74" r="2.5" fill="currentColor" stroke="none"/>
<circle cx="50" cy="50" r="21" stroke-width="1.2" stroke-dasharray="1.5 4"/>
</g>`,
  },
  {
    region: "West Bengal",
    code: "WB",
    tradition: "Bengal Patachitra, the sung narrative scroll",
    community: "Patua (Chitrakar) scroll painters of Naya, Pingla, West Midnapore",
    gi: "Bengal Patachitra GI-registered 2018",
    shows: "A pat hung open on its battens, its registers stacked one above the next, framed by the running border the Patuas paint down both sides",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path stroke-width="3" d="M18 8h64M18 92h64"/>
<path d="M50 8v6M50 86v6"/>
<rect x="26" y="14" width="48" height="72" stroke-width="2"/>
<path stroke-width="1.5" d="M31 14v72M69 14v72"/>
<path stroke-width="1.2" d="M28.5 20h2M28.5 30h2M28.5 40h2M28.5 50h2M28.5 60h2M28.5 70h2M28.5 80h2M71.5 20h-2M71.5 30h-2M71.5 40h-2M71.5 50h-2M71.5 60h-2M71.5 70h-2M71.5 80h-2"/>
<path stroke-width="2" d="M31 38h38M31 62h38"/>
<circle cx="50" cy="26" r="5"/>
<path d="M50 31v5M50 33l-6 3M50 33l6 3"/>
<circle cx="42" cy="50" r="4.5"/>
<path d="M42 54.5v4M42 56l-5 2M42 56l5 2"/>
<circle cx="60" cy="50" r="4.5"/>
<path d="M60 54.5v4M60 56l-5 2M60 56l5 2"/>
<path d="M36 76q7-8 14 0 7 8 14 0"/>
<path fill="currentColor" stroke="none" d="M48 68h4v4h-4z"/>
</g>`,
  },

  // ── Union territories ─────────────────────────────────────────────────────
  // Four of these have no folk-painting tradition of their own. Rather than
  // invent one, each entry names the craft or the built fabric that is actually
  // theirs and says so in the credit. A fabricated tradition would be a worse
  // answer than an honest one, and easy for anyone from the place to spot.
  {
    region: "Andaman and Nicobar Islands",
    code: "AN",
    isUT: true,
    tradition: "Nicobarese hodi canoe building — the islands have no indigenous painting tradition, and this is the craft that is theirs",
    community: "Nicobarese boat builders of Car Nicobar and the Nancowry group",
    gi: "Nicobari Hodi Craft GI-registered 2021",
    shows: "A hodi in strict side elevation — the long shallow hull, its lifted ends and the outrigger float carried off one side",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
<path d="M6 46q10 10 44 10t44-10"/>
<path d="M6 46q0-8 6-12M94 46q0-8-6-12"/>
<path d="M12 34q38-6 76 0"/>
<path stroke-width="1.5" d="M14 40q36-5 72 0"/>
<path d="M30 34v-6M50 34v-8M70 34v-6"/>
<path d="M24 70q30 8 56 0" stroke-width="3"/>
<path d="M34 56v14M50 58v13M66 56v14"/>
<path stroke-width="1.5" d="M42 57v13M58 57v13"/>
<path d="M50 26l-6 6h12z" fill="currentColor" stroke="none"/>
</g>`,
  },
  {
    region: "Chandigarh",
    code: "CH",
    isUT: true,
    tradition: "The Modulor grid of the Capitol Complex — Chandigarh has no indigenous folk tradition, being a planned city of 1953",
    community: "The city's own designed fabric, and the Rock Garden built from its rubble by Nek Chand",
    shows: "A concrete brise-soleil bay: an outer frame subdivided into deliberately unequal cells, as the facades are",
    svg: `<g fill="none" stroke="currentColor" stroke-width="3">
<rect x="8" y="8" width="84" height="84"/>
<path stroke-width="2.5" d="M32 8v84M46 8v84M76 8v84M8 30h84M8 52h84M8 74h84"/>
<path fill="currentColor" stroke="none" d="M12 12h16v14H12zM50 34h22v14H50zM12 56h16v14H12zM80 78h8v10h-8z"/>
<path stroke-width="2" d="M50 12h22M50 16h22M12 34h16M12 38h16M50 56h22M50 60h22M32 78h10M46 78h10"/>
</g>`,
  },
  {
    region: "Dadra and Nagar Haveli and Daman and Diu",
    code: "DH",
    isUT: true,
    tradition: "Warli wall painting of the Dadra and Nagar Haveli hills, and the plaited mat work of the coast",
    community: "Warli, Dhodia and Kokna Adivasi households inland; coastal weaving families at Daman and Diu",
    shows: "A plaited mat corner — paired strap edges crossing at 45 degrees, the way a mat is actually built",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square">
<path d="M-6 30L30 -6M-6 46L46 -6M-6 62L62 -6M-6 78L78 -6M-6 94L94 -6M10 106L106 10M26 106L106 26M42 106L106 42M58 106L106 58M74 106L106 74"/>
<path stroke-width="1.2" d="M-6 38L38 -6M-6 54L54 -6M-6 70L70 -6M-6 86L86 -6M2 106L106 2M18 106L106 18M34 106L106 34M50 106L106 50M66 106L106 66M82 106L106 82"/>
<path d="M-6 70L70 106M-6 54L54 106M-6 38L38 106M-6 22L22 106M6 -6L106 94M22 -6L106 78M38 -6L106 62M54 -6L106 46M70 -6L106 30"/>
<path stroke-width="1.2" d="M-6 62L62 106M-6 46L46 106M-6 30L30 106M14 -6L106 86M30 -6L106 70M46 -6L106 54M62 -6L106 38"/>
<rect x="2" y="2" width="96" height="96" stroke-width="3.5"/>
</g>`,
  },
  {
    region: "Delhi",
    code: "DL",
    isUT: true,
    tradition: "The pierced stone jaali of Delhi's Sultanate and Mughal architecture",
    community: "The stonecutters' work at Nizamuddin, Purana Qila and the Red Fort, and the sangtarash trade that continues it",
    shows: "One jaali module and its repeat — a twelve-pointed rosette ringed by sixes, with the residue resolving into hexagons",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2">
<path d="M50 26l6 10 12-2-6 10 8 8-11 3v12l-9-6-9 6V55l-11-3 8-8-6-10 12 2z"/>
<circle cx="50" cy="50" r="7"/>
<path d="M50 20l5 6-5 6-5-6zM50 80l5-6-5-6-5 6zM20 50l6 5 6-5-6-5zM80 50l-6 5-6-5 6-5z"/>
<path d="M26 26l8 2 2 8-8-2zM74 26l-8 2-2 8 8-2zM26 74l8-2 2-8-8 2zM74 74l-8-2-2-8 8 2z"/>
<path stroke-width="1.5" d="M50 8l14 8v16l-14 8-14-8V16zM50 60l14 8v16l-14 8-14-8V68zM4 34l14 8v16l-14 8M96 34l-14 8v16l14 8"/>
<path stroke-width="1.5" d="M0 8h100M0 92h100"/>
</g>`,
  },
  {
    region: "Jammu and Kashmir",
    code: "JK",
    isUT: true,
    tradition: "Kashmiri papier-mâché naqashi painting",
    community: "Naqash painting families of downtown Srinagar",
    gi: "Kashmir Paper Machie GI-registered 2012",
    shows: "A naqashi cartouche around a standing chinar leaf, with the almond-flower border the trade runs around a panel edge",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
<path d="M50 20q22 0 30 14 8 14 0 28-8 14-30 14t-30-14q-8-14 0-28 8-14 30-14z"/>
<path stroke-width="1.3" d="M50 25q19 0 26 12 7 12 0 24-7 12-26 12t-26-12q-7-12 0-24 7-12 26-12z"/>
<path d="M50 76V56"/>
<path d="M50 56q-6-2-8-8-6 2-9-3 5-4 3-9 6 1 8-5 3 5 6 5 3 0 6-5 2 6 8 5-2 5 3 9-3 5-9 3-2 6-8 8z"/>
<path stroke-width="1.3" d="M50 56V28M50 44l-8-6M50 44l8-6M50 36l-6-5M50 36l6-5"/>
<path stroke-width="1.5" d="M8 50q4-6 8 0 4 6 8 0M76 50q4-6 8 0 4 6 8 0M42 8q6 4 0 8M42 92q6-4 0-8M58 8q-6 4 0 8M58 92q-6-4 0-8"/>
<circle cx="50" cy="12" r="3" fill="currentColor" stroke="none"/>
<circle cx="50" cy="88" r="3" fill="currentColor" stroke="none"/>
</g>`,
  },
  {
    region: "Ladakh",
    code: "LA",
    isUT: true,
    tradition: "Shingskos, the carved and painted woodwork of Ladakhi houses and monasteries",
    community: "Shing-mkhan carpenters of Leh and the Indus valley villages",
    shows: "A rabsal window bay — the willow-stick talu cornice above, the framed lights below, drawn as the carpentry stacks it",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path d="M6 20h88M6 30h88"/>
<path d="M10 20V8M20 20V8M30 20V8M40 20V8M50 20V8M60 20V8M70 20V8M80 20V8M90 20V8"/>
<path fill="currentColor" stroke="none" d="M12 34h8v8h-8zM26 34h8v8h-8zM40 34h8v8h-8zM54 34h8v8h-8zM68 34h8v8h-8zM82 34h8v8h-8z"/>
<path d="M6 48h88"/>
<rect x="14" y="54" width="30" height="34"/>
<rect x="56" y="54" width="30" height="34"/>
<path d="M29 54v34M14 71h30M71 54v34M56 71h30"/>
<path stroke-width="1.3" d="M20 60h4M35 60h4M62 60h4M77 60h4M20 78h4M35 78h4M62 78h4M77 78h4"/>
<path stroke-width="3" d="M6 94h88"/>
</g>`,
  },
  {
    region: "Lakshadweep",
    code: "LD",
    isUT: true,
    tradition: "Coir twisting and coconut-shell craft — the islands have no painting tradition, and rope is what they make",
    community: "Coir-working households across Kavaratti, Minicoy and the inhabited islands",
    shows: "A two-ply coir rope course running around a plate, with the coconut-frond midrib pattern inside it",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
<path d="M4 4q4 5 8 0t8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0M4 96q4-5 8 0t8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0"/>
<path d="M4 4q5 4 0 8t0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8M96 4q-5 4 0 8t0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0 8"/>
<path d="M50 76V26"/>
<path stroke-width="1.6" d="M50 70l-14 6M50 70l14 6M50 62l-16 5M50 62l16 5M50 54l-16 4M50 54l16 4M50 46l-15 3M50 46l15 3M50 38l-13 2M50 38l13 2M50 31l-9 1M50 31l9 1"/>
<circle cx="50" cy="24" r="3" fill="currentColor" stroke="none"/>
</g>`,
  },
  {
    region: "Puducherry",
    code: "PY",
    isUT: true,
    tradition: "The Franco-Tamil vernacular of the Boulevard Town",
    community: "The building trades of the Tamil and French quarters of Puducherry",
    shows: "A flat facade fragment: thinnai benches either side of a panelled door, under the eave line and a fanlight",
    svg: `<g fill="none" stroke="currentColor" stroke-width="2.5">
<path stroke-width="3" d="M4 92h92"/>
<path d="M8 92V74h22v18M70 92V74h22v18"/>
<path stroke-width="1.5" d="M8 80h22M70 80h22"/>
<path d="M6 66h88"/>
<path d="M16 66v8M50 62v4M84 66v8"/>
<rect x="36" y="30" width="28" height="62"/>
<path d="M50 30v62"/>
<rect x="40" y="38" width="6" height="18" stroke-width="1.5"/>
<rect x="54" y="38" width="6" height="18" stroke-width="1.5"/>
<rect x="40" y="64" width="6" height="18" stroke-width="1.5"/>
<rect x="54" y="64" width="6" height="18" stroke-width="1.5"/>
<path d="M36 30q14-16 28 0"/>
<path stroke-width="1.5" d="M43 22v8M50 19v11M57 22v8"/>
<path stroke-width="3" d="M28 12h44"/>
<path d="M28 12l8-6M72 12l-8-6"/>
</g>`,
  },
];
