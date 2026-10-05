/**
 * LLM Service
 * Supports: Gemini (free) | OpenAI | Ollama (local)
 * Switch via LLM_PROVIDER env var
 */
import { config } from '../config/env.js';

// ── Local Fallback Generator ─────────────────────────
function generateLocalCompletion(prompt, systemPrompt = '') {
  // 1. Quiz Generation Prompt
  if (prompt.includes('multiple choice quiz') || prompt.includes('questions')) {
    let subject = 'Computer Science';
    if (/DBMS|database/i.test(prompt)) subject = 'DBMS';
    else if (/OS|operating system/i.test(prompt)) subject = 'Operating Systems';
    else if (/DCCN|network/i.test(prompt)) subject = 'DCCN';
    else if (/COA|architecture/i.test(prompt)) subject = 'COA';

    const questionBanks = {
      DBMS: [
        { q: "What does ACID stand for in transaction processing?", options: ["Atomicity, Consistency, Isolation, Durability", "Action, Constraint, Integrity, Dependency", "Array, Cursor, Index, Database", "Access, Control, Identification, Data"], answer: 0, explanation: "ACID properties ensure reliable processing of database transactions.", topic: "Transactions" },
        { q: "Which normal form removes partial functional dependencies?", options: ["1NF", "2NF", "3NF", "BCNF"], answer: 1, explanation: "2NF requires the table to be in 1NF and all non-key attributes to be fully functionally dependent on the primary key.", topic: "Normalization" },
        { q: "Which SQL clause is used to filter group results after aggregation?", options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"], answer: 1, explanation: "HAVING filters groups created by GROUP BY, while WHERE filters individual rows.", topic: "SQL Queries" },
        { q: "What is the primary role of a Foreign Key?", options: ["Uniquely identify a record", "Enforce referential integrity between tables", "Encrypt sensitive data", "Index query columns"], answer: 1, explanation: "Foreign keys maintain referential integrity between related tables.", topic: "Relational Schema" },
        { q: "Which indexing structure is commonly used in relational databases for range queries?", options: ["B+ Tree", "Hash Table", "Binary Search Tree", "Linked List"], answer: 0, explanation: "B+ Trees keep data sorted and allow efficient range searches as leaf nodes are linked.", topic: "Indexing" }
      ],
      "Operating Systems": [
        { q: "What condition is necessary for a deadlock to occur?", options: ["Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait", "Starvation, Thrashing, Paging, Segmentation", "Round Robin, SJF, Priority, FIFO", "Context Switch, Interrupt, Trap, Signal"], answer: 0, explanation: "The four Coffman conditions must hold simultaneously for a deadlock.", topic: "Deadlocks" },
        { q: "What is thrashing in an Operating System?", options: ["High CPU utilization with no I/O", "Excessive page swapping leading to minimal useful execution", "Deleting temporary cache files", "Multiple processes competing for a lock"], answer: 1, explanation: "Thrashing occurs when the system spends more time servicing page faults than executing instructions.", topic: "Virtual Memory" },
        { q: "Which scheduling algorithm is preemptive by default?", options: ["Round Robin", "First Come First Served", "Shortest Job First (standard)", "Non-preemptive Priority"], answer: 0, explanation: "Round Robin uses time slices (quanta) to preempt currently running processes.", topic: "CPU Scheduling" },
        { q: "What is the function of the Translation Lookaside Buffer (TLB)?", options: ["Cache for virtual-to-physical address translations", "Store process control blocks", "Schedule I/O requests", "Allocate heap memory"], answer: 0, explanation: "TLB is a fast hardware cache that accelerates virtual address translation.", topic: "Memory Management" },
        { q: "What is a race condition?", options: ["When two threads access shared data concurrently and the outcome depends on execution order", "When CPU clock speed exceeds memory bus speed", "A network routing loop", "When a process finishes before its parent"], answer: 0, explanation: "Race conditions arise when concurrent execution leads to indeterminate states.", topic: "Process Synchronization" }
      ],
      DCCN: [
        { q: "Which OSI layer is responsible for end-to-end reliability and flow control?", options: ["Transport Layer", "Network Layer", "Data Link Layer", "Physical Layer"], answer: 0, explanation: "The Transport Layer (e.g. TCP) provides end-to-end communication services for applications.", topic: "OSI Model" },
        { q: "What is the primary difference between IPv4 and IPv6?", options: ["IPv4 is 32-bit whereas IPv6 is 128-bit", "IPv4 is connection-oriented, IPv6 is not", "IPv6 does not support routing", "IPv4 uses hex notation"], answer: 0, explanation: "IPv4 addresses are 32 bits long, while IPv6 addresses are 128 bits.", topic: "IP Addressing" },
        { q: "Which protocol resolves an IP address to a physical MAC address?", options: ["ARP", "RARP", "DHCP", "DNS"], answer: 0, explanation: "Address Resolution Protocol (ARP) maps an IP address to a local MAC address.", topic: "Network Protocols" },
        { q: "What is the purpose of the 3-Way Handshake in TCP?", options: ["Establish a synchronized connection state before data transfer", "Encrypt the payload with SSL", "Compress transmission packets", "Assign DHCP IP addresses"], answer: 0, explanation: "SYN, SYN-ACK, ACK synchronizes sequence numbers to ensure reliable two-way communication.", topic: "TCP Protocol" },
        { q: "Which topology connects every node directly to a central hub or switch?", options: ["Star", "Bus", "Ring", "Mesh"], answer: 0, explanation: "In a Star topology, all devices connect to a central controller.", topic: "Network Topology" }
      ],
      COA: [
        { q: "What are the stages of a classic 5-stage RISC instruction pipeline?", options: ["IF, ID, EX, MEM, WB", "FETCH, DECODE, STORE, LOOP, JUMP", "ALU, REG, RAM, DISK, BUS", "START, RUN, WAIT, RESUME, STOP"], answer: 0, explanation: "Instruction Fetch, Instruction Decode, Execute, Memory Access, Write Back.", topic: "Pipelining" },
        { q: "What principle makes cache memory effective?", options: ["Locality of Reference (Temporal and Spatial)", "Moore's Law", "Amdahl's Law", "Von Neumann Bottleneck"], answer: 0, explanation: "Temporal locality (recently accessed items) and spatial locality (nearby items) enable fast cache hits.", topic: "Cache Memory" },
        { q: "In 2's complement representation, how is a negative number formed?", options: ["Invert all bits and add 1", "Invert all bits and subtract 1", "Shift left by 1 bit", "Set the MSB to 0"], answer: 0, explanation: "Two's complement is obtained by taking the one's complement and adding one.", topic: "Data Representation" },
        { q: "What is the function of the Program Counter (PC)?", options: ["Holds the address of the next instruction to be fetched", "Stores the result of the last ALU operation", "Counts the total CPU clock cycles", "Manages interrupt priority levels"], answer: 0, explanation: "The Program Counter points to the memory location of the next instruction.", topic: "CPU Registers" },
        { q: "Which hazard occurs in pipelining when an instruction depends on the result of a previous instruction?", options: ["Data Hazard", "Structural Hazard", "Control Hazard", "Branch Hazard"], answer: 0, explanation: "Data hazards arise when instructions exhibit read-after-write (RAW) dependencies.", topic: "Hazards" }
      ]
    };

    const questions = questionBanks[subject] || questionBanks.DBMS;
    return JSON.stringify({ questions });
  }

  // 2. Study Plan Prompt
  if (prompt.includes('7-day study plan') || prompt.includes('"days":')) {
    return JSON.stringify({
      days: [
        {
          day: "Monday",
          focus: "Core Fundamentals & Concept Mapping",
          tasks: [
            { text: "Review key chapter definitions & core formulas", duration: "45 min", priority: "high" },
            { text: "Summarize top 3 foundational concepts in concise bullet points", duration: "30 min", priority: "medium" },
            { text: "Practice 5 self-check multiple choice questions", duration: "25 min", priority: "medium" }
          ],
          tip: "Start the week with active recall: test yourself before re-reading notes."
        },
        {
          day: "Tuesday",
          focus: "Deep Dive into Weak Subject Areas",
          tasks: [
            { text: "Focus review on topics with low quiz scores", duration: "50 min", priority: "high" },
            { text: "Work through 2 step-by-step example numericals/problems", duration: "40 min", priority: "high" },
            { text: "Create flashcards for tricky terms and rules", duration: "20 min", priority: "low" }
          ],
          tip: "Focusing on weak spots yields the largest score improvements."
        },
        {
          day: "Wednesday",
          focus: "Midweek Problem Solving & Code/Syntax Drill",
          tasks: [
            { text: "Practice past exam short questions under timed conditions", duration: "45 min", priority: "high" },
            { text: "Diagram architectural or algorithmic workflows", duration: "35 min", priority: "medium" },
            { text: "Review mistake log and note recurring error patterns", duration: "25 min", priority: "medium" }
          ],
          tip: "Draw diagrams from memory — visual encoding doubles retention."
        },
        {
          day: "Thursday",
          focus: "Cross-Topic Synthesis & Applications",
          tasks: [
            { text: "Connect concepts across syllabus modules", duration: "45 min", priority: "medium" },
            { text: "Take a focused 10-question AI practice quiz", duration: "30 min", priority: "high" },
            { text: "Log any incorrect answers for weekend revision", duration: "20 min", priority: "medium" }
          ],
          tip: "Explain difficult concepts out loud as if teaching a classmate."
        },
        {
          day: "Friday",
          focus: "Exam-Style High Probability Questions",
          tasks: [
            { text: "Solve high-weightage questions from recent university papers", duration: "55 min", priority: "high" },
            { text: "Review differences & comparisons table (e.g. TCP vs UDP, 2NF vs 3NF)", duration: "35 min", priority: "high" },
            { text: "Light recap of cheat sheet notes", duration: "20 min", priority: "low" }
          ],
          tip: "Highlight difference tables: examiners frequently ask compare-and-contrast questions."
        },
        {
          day: "Saturday",
          focus: "Full Mock Test & Mistake Revision",
          tasks: [
            { text: "Complete simulated timed mock exam session", duration: "60 min", priority: "high" },
            { text: "Thoroughly review mistakes and formulate correct explanations", duration: "40 min", priority: "high" },
            { text: "Organize formulas and quick-reference summary sheets", duration: "25 min", priority: "medium" }
          ],
          tip: "Treat mock exams seriously: building exam stamina reduces test anxiety."
        },
        {
          day: "Sunday",
          focus: "Consolidation & Mental Recharging",
          tasks: [
            { text: "Rapid flashcard review of all core formulas & definitions", duration: "35 min", priority: "medium" },
            { text: "Plan targets and priorities for the upcoming study cycle", duration: "25 min", priority: "low" },
            { text: "Relaxation, healthy rest, and early sleep routine", duration: "30 min", priority: "low" }
          ],
          tip: "Rest is when memory consolidation occurs in the brain. Get good sleep!"
        }
      ]
    });
  }

  // 3. Recommendations Prompt
  if (prompt.includes('recommendations')) {
    return JSON.stringify({
      recommendations: [
        { icon: "🎯", text: "Dedicate 20 minutes daily to active recall on your lowest-scoring topics.", priority: "high" },
        { icon: "⏱️", text: "Use 25-minute Pomodoro focus blocks to maintain peak concentration.", priority: "high" },
        { icon: "📝", text: "Upload your class lecture notes so the AI tutor can cite your exact syllabus.", priority: "medium" },
        { icon: "🔄", text: "Review your Mistake Log weekly to prevent repeating the same errors.", priority: "medium" }
      ]
    });
  }

  return "I have reviewed your request. To enable live AI generations with Google's Gemini 2.0 Flash model, please set your GEMINI_API_KEY in the `.env` file.";
}

function generateLocalChatReply(messages, systemPrompt = '') {
  const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user')?.content || '';
  const lower = lastUserMsg.toLowerCase();

  // Extract context if present from student notes
  const notesMatch = systemPrompt.match(/RELEVANT CONTENT FROM STUDENT'S UPLOADED NOTES:\s*([\s\S]*?)(?=\n\nINSTRUCTIONS:|$)/);
  const notesContext = notesMatch ? notesMatch[1].trim() : '';

  let reply = '';

  if (notesContext && notesContext.length > 50) {
    reply = `Based on your uploaded study notes:\n\n${notesContext.slice(0, 400)}...\n\n**Key Takeaway:** Make sure to understand the core principles and how they connect to your syllabus objectives.`;
  } else if (/hello|hi|hey|greet/i.test(lower)) {
    reply = `Hello! 👋 I'm your **EduMind Pro** AI Study Companion. How can I help you excel in your studies today? You can ask me to explain any concept, generate practice quizzes, break down complex algorithms, or review your study plan!`;
  } else if (/dbms|database|sql|acid|normaliz/i.test(lower)) {
    reply = `Here is a clear breakdown for **DBMS**:\n\n1. **ACID Properties:**\n   - **Atomicity:** All-or-nothing execution.\n   - **Consistency:** Preserves database invariants before and after transactions.\n   - **Isolation:** Concurrent transactions don't interfere with each other.\n   - **Durability:** Committed updates survive system crashes.\n\n2. **Normalization:**\n   - **1NF:** Atomic values, no repeating groups.\n   - **2NF:** In 1NF and no partial dependencies on composite keys.\n   - **3NF:** In 2NF and no transitive dependencies.\n\nWould you like me to test your understanding with a quick practice problem?`;
  } else if (/os|operating system|deadlock|process|thread|paging/i.test(lower)) {
    reply = `Here is an intuitive explanation for **Operating Systems**:\n\n1. **Process vs. Thread:** A process is an executing program with its own memory address space; a thread is a lightweight execution unit inside a process sharing the same memory.\n2. **Deadlock Conditions (Coffman Conditions):**\n   - Mutual Exclusion\n   - Hold and Wait\n   - No Preemption\n   - Circular Wait\n3. **Virtual Memory & Paging:** Divides physical memory into frames and logical memory into pages to prevent external fragmentation.\n\nWhat specific OS topic would you like to explore next?`;
  } else if (/network|dccn|tcp|udp|osi|ip/i.test(lower)) {
    reply = `Here is a structured overview of **Networking & DCCN**:\n\n- **OSI 7 Layers:** Physical → Data Link → Network → Transport → Session → Presentation → Application.\n- **TCP vs UDP:**\n  - **TCP:** Connection-oriented, reliable, ordered, flow & congestion controlled (e.g., HTTP, SSH, FTP).\n  - **UDP:** Connectionless, fast, lightweight, best-effort (e.g., DNS, VoIP, Video Streaming).\n- **Key Devices:** Routers operate at Layer 3 (IP); Switches operate at Layer 2 (MAC).`;
  } else {
    reply = `Great question regarding: **"${lastUserMsg}"**!\n\nHere is a step-by-step conceptual breakdown:\n1. **Core Concept:** Break the problem down into its fundamental definitions and assumptions.\n2. **Mechanism:** Trace how inputs are transformed into outputs step-by-step.\n3. **Application:** Relate the theory directly to realistic examination problems or practical coding scenarios.\n\nFeel free to ask a follow-up or test yourself with the "Start Quiz" button on the sidebar!`;
  }

  if (!config.GEMINI_API_KEY) {
    reply += '\n\n*(Note: Running in local study engine mode. To enable live Google Gemini 2.0 Flash AI, add your GEMINI_API_KEY in the .env file.)*';
  }

  return reply;
}

// ── Gemini ────────────────────────────────────────────
async function callGemini(prompt, systemPrompt = '', maxTokens = 1500) {
  if (!config.GEMINI_API_KEY) {
    return generateLocalCompletion(prompt, systemPrompt);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`;
  const contents = [];

  if (systemPrompt) {
    contents.push({ role: 'user',  parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow those instructions.' }] });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn(`⚠️ Gemini API error (${err.error?.message || res.statusText}). Using local completion fallback.`);
      return generateLocalCompletion(prompt, systemPrompt);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || generateLocalCompletion(prompt, systemPrompt);
  } catch (err) {
    console.warn(`⚠️ Gemini call failed: ${err.message}. Using local completion fallback.`);
    return generateLocalCompletion(prompt, systemPrompt);
  }
}

// ── Gemini Chat (multi-turn) ─────────────────────────
async function callGeminiChat(messages, systemPrompt = '', maxTokens = 1500) {
  if (!config.GEMINI_API_KEY) {
    return generateLocalChatReply(messages, systemPrompt);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`;
  const contents = [];

  if (systemPrompt) {
    contents.push({ role: 'user',  parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
  }

  messages.forEach(m => {
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 } }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn(`⚠️ Gemini Chat API error (${err.error?.message || res.statusText}). Using local chat fallback.`);
      return generateLocalChatReply(messages, systemPrompt);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || generateLocalChatReply(messages, systemPrompt);
  } catch (err) {
    console.warn(`⚠️ Gemini Chat failed: ${err.message}. Using local chat fallback.`);
    return generateLocalChatReply(messages, systemPrompt);
  }
}

// ── OpenAI ────────────────────────────────────────────
async function callOpenAI(messages, systemPrompt = '', maxTokens = 1500) {
  const allMessages = [];
  if (systemPrompt) allMessages.push({ role: 'system', content: systemPrompt });
  allMessages.push(...messages);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: allMessages, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`OpenAI error: ${err.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Ollama (local) ────────────────────────────────────
async function callOllama(messages, systemPrompt = '', maxTokens = 1500) {
  const allMessages = [];
  if (systemPrompt) allMessages.push({ role: 'system', content: systemPrompt });
  allMessages.push(...messages);

  const res = await fetch(`${config.OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.OLLAMA_MODEL,
      messages: allMessages,
      stream: false,
      options: { num_predict: maxTokens },
    }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
  const data = await res.json();
  return data.message?.content || '';
}

// ── Public API ────────────────────────────────────────
/**
 * Generate a single completion (for quiz/plan/recommendations)
 */
export async function complete(prompt, systemPrompt = '', maxTokens = 1500) {
  switch (config.LLM_PROVIDER) {
    case 'gemini':
      return callGemini(prompt, systemPrompt, maxTokens);
    case 'openai':
      return callOpenAI([{ role: 'user', content: prompt }], systemPrompt, maxTokens);
    case 'ollama':
      return callOllama([{ role: 'user', content: prompt }], systemPrompt, maxTokens);
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${config.LLM_PROVIDER}`);
  }
}

/**
 * Multi-turn chat completion
 * messages = [{ role: 'user'|'assistant', content: '...' }]
 */
export async function chat(messages, systemPrompt = '', maxTokens = 1500) {
  switch (config.LLM_PROVIDER) {
    case 'gemini':
      return callGeminiChat(messages, systemPrompt, maxTokens);
    case 'openai':
      return callOpenAI(messages, systemPrompt, maxTokens);
    case 'ollama':
      return callOllama(messages, systemPrompt, maxTokens);
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${config.LLM_PROVIDER}`);
  }
}

/**
 * Parse JSON safely from LLM output (strips markdown fences)
 */
export function parseJSON(raw) {
  const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = clean.indexOf('{');
  const end   = clean.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in LLM response');
  return JSON.parse(clean.slice(start, end + 1));
}
