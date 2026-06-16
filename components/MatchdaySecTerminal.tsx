"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type FeedKind = "system" | "command" | "analyst" | "commentary" | "success" | "warning";

type FeedLine = {
  id: string;
  kind: FeedKind;
  text: string;
};

type ActionRecord = {
  stepId: string;
  title: string;
  prompt: string;
  answer: string;
  result: "correct" | "wrong" | "skipped" | "submitted";
  feedback: string;
  commentary: string;
  takeaway: string;
};

type Choice = {
  label: string;
  correct?: boolean;
  feedback: string;
};

type MissionStep = {
  id: string;
  title: string;
  type: "choice" | "choiceWithLogs" | "typed" | "freeform";
  alert?: string;
  severity?: "Critical" | "High" | "Medium" | "Low";
  affected?: string;
  briefing: string;
  evidence?: string[];
  prompt: string;
  choices?: Choice[];
  acceptedAnswers?: string[];
  typedFeedback?: string;
  modelAnswer?: string;
  hint: string;
  logs?: string[];
  playbook: string[];
  commentary: {
    correct: string;
    wrong?: string;
    skipped: string;
  };
  takeaway: string;
};

const HUB_URL = "https://side-cup-quest.vercel.app/";

const commands = [
  { command: "/help", description: "list commands" },
  { command: "/hint", description: "request a small nudge" },
  { command: "/logs", description: "open current incident logs" },
  { command: "/status", description: "show service health" },
  { command: "/playbook", description: "view response notes" },
  { command: "/brief", description: "repeat objective" },
  { command: "/whoami", description: "show analyst session" },
  { command: "/skip", description: "move past current task" },
  { command: "/clear", description: "clear terminal output" },
];

const serviceHealth = [
  { name: "ticketing", label: "Ticketing Portal", status: "degraded", signal: "WARN" },
  { name: "dns", label: "DNS", status: "warning", signal: "WARN" },
  { name: "payments", label: "Payments", status: "healthy", signal: "OK" },
  { name: "wifi", label: "Public Wi-Fi", status: "healthy", signal: "OK" },
  { name: "admin", label: "Admin Portal", status: "warning", signal: "WATCH" },
  { name: "broadcast", label: "Broadcast Feed", status: "healthy", signal: "OK" },
];

const missionSteps: MissionStep[] = [
  {
    id: "initial-triage",
    title: "Initial triage",
    type: "choice",
    alert: "Ticketing traffic spike",
    severity: "High",
    affected: "public ticketing web app",
    briefing:
      "Kickoff operations are live. Ticketing is slowing down, DNS is flashing warnings, and Operation Command needs one calm first read before anyone touches production controls.",
    evidence: [
      "traffic increased 420% in 8 minutes",
      "checkout latency is rising",
      "requests are concentrated in a few regions",
      "no confirmed outage yet",
    ],
    prompt: "What is the best first move?",
    choices: [
      { label: "Block all traffic immediately", feedback: "Too disruptive. That could take real users offline before we understand the signal." },
      { label: "Check traffic source distribution", correct: true, feedback: "Correct. Start with visibility before containment." },
      { label: "Restart the server immediately", feedback: "Too early. Restarting may make the outage worse and destroy useful context." },
      { label: "Wait until users complain", feedback: "Too passive. Degraded matchday services need triage before they become outages." },
    ],
    hint: "Before containment, identify whether the traffic looks legitimate, automated, or DDoS-like.",
    logs: [
      "[19:40:02] ticketing-web traffic +420% over baseline",
      "[19:40:09] checkout-api latency p95=1440ms",
      "[19:40:15] top regions: us-east, eu-west, unknown-proxy",
      "[19:40:22] bot-like user agents detected=38%",
    ],
    playbook: [
      "Confirm impact before changing controls.",
      "Compare source, user-agent, and region patterns.",
      "Protect availability while preserving legitimate access.",
    ],
    commentary: {
      correct: "Operation Command: good first touch. You read the field before making the challenge.",
      wrong: "Operation Command: useful instinct, wrong timing. We need eyes on the signal first.",
      skipped: "Operation Command: skipped. The room moves on, but the timeline keeps receipts.",
    },
    takeaway: "SOC/NOC triage starts with evidence. Validate the signal before taking disruptive action.",
  },
  {
    id: "logs-review",
    title: "Log review",
    type: "choiceWithLogs",
    alert: "Traffic pattern review",
    severity: "High",
    affected: "ticketing + checkout",
    briefing:
      "The first decision bought time. Now pull the logs and identify what deserves attention. Operation Command needs a pattern, not a vibe.",
    evidence: ["traffic spike still active", "checkout latency elevated", "operations asked for a clean read"],
    prompt: "Run /logs, then choose the pattern that deserves attention.",
    choices: [
      { label: "Normal matchday traffic only", feedback: "Not quite. The logs show more than normal matchday demand." },
      { label: "Bot-like user agents and unknown proxy traffic", correct: true, feedback: "Correct. Suspicious automation appears mixed with real traffic." },
      { label: "Payment terminal failure", feedback: "Payments are currently healthy." },
      { label: "Broadcast feed outage", feedback: "Broadcast is healthy. Always match the action to the affected service." },
    ],
    hint: "Look for source and user-agent behavior. That is where the weirdness shows up.",
    logs: [
      "[19:43:10] ticketing-web requests/min=18,420 baseline=4,310",
      "[19:43:12] region=unknown-proxy requests=6,942 user_agent=randomized",
      "[19:43:15] bot-like user agents=41% captcha_challenge_rate=up",
      "[19:43:20] checkout-api p95=1720ms error_rate=2.1%",
      "[19:43:24] payments status=healthy fraud_alerts=none",
    ],
    playbook: ["Review logs before containment.", "Separate legitimate demand from suspicious automation.", "Preserve access for real users where possible."],
    commentary: {
      correct: "Operation Command: VAR check complete. That traffic was not just matchday excitement.",
      wrong: "Operation Command: replay says look again. The pattern is in the traffic behavior.",
      skipped: "Operation Command: skipped log review. Bold. The logs are still blinking at us.",
    },
    takeaway: "Logs help analysts separate symptoms from causes. Good response depends on knowing what changed and where.",
  },
  {
    id: "service-identification",
    title: "Service identification",
    type: "typed",
    alert: "Checkout latency rising",
    severity: "Medium",
    affected: "checkout-api",
    briefing:
      "Before containment, name the service showing the strongest performance signal. This keeps teams from chasing the wrong system.",
    evidence: ["ticketing-web request volume is high", "checkout-api p95 latency is above normal", "payments are healthy", "broadcast feed unaffected"],
    prompt: "Which service should be investigated first? Type the service name.",
    acceptedAnswers: ["checkout-api", "checkout api", "checkout"],
    typedFeedback: "Accepted. checkout-api is the clearest service-level signal in the logs.",
    hint: "Look for the service attached to the p95 latency increase.",
    logs: [
      "[19:45:01] ticketing-web requests/min=18,420",
      "[19:45:04] checkout-api p95=1720ms error_rate=2.1%",
      "[19:45:07] payments status=healthy",
      "[19:45:10] broadcast-feed status=healthy",
    ],
    playbook: ["Name the affected service clearly.", "Avoid vague escalation like 'the site is slow'.", "Tie action to the signal that triggered it."],
    commentary: {
      correct: "Operation Command: that is the pass we needed. Specific service, specific signal.",
      wrong: "Operation Command: close, but we need the exact service from the logs.",
      skipped: "Operation Command: skipped service identification. The service map is side-eyeing us.",
    },
    takeaway: "Precise service identification helps teams route incidents and escalate clearly.",
  },
  {
    id: "containment",
    title: "Containment call",
    type: "choice",
    alert: "Suspicious automated traffic",
    severity: "High",
    affected: "ticketing portal",
    briefing:
      "We have enough evidence to act. Reduce suspicious activity without shutting the gates on legitimate users.",
    evidence: ["bot-like user agents around 41%", "unknown proxy traffic elevated", "ticketing degraded but online", "legitimate checkouts still completing"],
    prompt: "What containment action makes the most sense?",
    choices: [
      { label: "Block every user from every region", feedback: "That protects the service by making it unusable. Not the move." },
      { label: "Apply targeted rate limiting and bot filtering", correct: true, feedback: "Correct. Targeted controls reduce suspicious load while preserving access." },
      { label: "Delete the logs", feedback: "No. Logs are evidence and help with investigation and reporting." },
      { label: "Restart DNS", feedback: "DNS is not the main cause here. Avoid unrelated changes during incidents." },
    ],
    hint: "Containment should reduce harm without causing a bigger outage.",
    logs: [
      "[19:47:02] waf suggestion: challenge suspicious user-agent clusters",
      "[19:47:05] rate-limit candidate: unknown-proxy / checkout endpoint",
      "[19:47:08] legitimate regions: stable conversion path observed",
    ],
    playbook: ["Prefer targeted containment over broad disruption.", "Monitor false positives after applying controls.", "Communicate expected impact."],
    commentary: {
      correct: "Operation Command: proper defending. Close the gaps, do not foul the whole stadium.",
      wrong: "Operation Command: that is a red-card-everyone strategy. We need targeted containment.",
      skipped: "Operation Command: skipped containment. Somewhere, a dashboard just sighed.",
    },
    takeaway: "Good containment limits attacker impact while protecting availability for real users.",
  },
  {
    id: "admin-access",
    title: "Admin access alert",
    type: "choice",
    alert: "Suspicious admin login sequence",
    severity: "High",
    affected: "admin portal",
    briefing: "Ticketing is stabilizing, but a quieter alert just hit the queue. This one touches privileged access.",
    evidence: ["42 failed admin logins in 10 minutes", "one successful login from an unusual location", "admin panel accessed after success", "temporary operations admin account"],
    prompt: "What is the best next action?",
    choices: [
      { label: "Ignore it because one login succeeded", feedback: "A successful login after repeated failures can be the moment an account becomes compromised." },
      { label: "Temporarily disable the admin account and investigate", correct: true, feedback: "Correct. Reduce risk quickly, preserve evidence, and verify the account owner." },
      { label: "Shut down the whole website", feedback: "Too broad. This is a focused privileged-access incident." },
      { label: "Delete the account permanently without review", feedback: "Too destructive. Suspend, preserve evidence, and investigate first." },
    ],
    hint: "Repeated failures followed by success from an unusual location should trigger account-protection steps.",
    logs: [
      "[19:52:02] admin-login user=temp.ops.admin failed_attempts=42",
      "[19:52:13] admin-login success ip=203.0.113.88 geo=unusual",
      "[19:52:21] admin-panel path=/admin/tickets/export accessed=true",
      "[19:52:30] mfa_challenge status=not_present",
    ],
    playbook: ["Temporarily suspend suspicious access.", "Preserve login, IP, and session evidence.", "Escalate for account owner verification and access review."],
    commentary: {
      correct: "Operation Command: clean tackle. The admin panel almost got caught sleeping.",
      wrong: "Operation Command: replay is not kind to that decision. Treat privileged access seriously.",
      skipped: "Operation Command: skipped admin access. That is how villains get extra time.",
    },
    takeaway: "Suspicious successful logins after repeated failures can indicate compromise. Fast containment protects privileged systems.",
  },
  {
    id: "status-update",
    title: "Operations update",
    type: "freeform",
    alert: "Stakeholder communication request",
    severity: "Medium",
    affected: "matchday operations",
    briefing: "The room is calmer. Technical containment is in progress, but operations needs a short update they can actually use.",
    evidence: ["suspicious traffic targeted with rate limiting", "legitimate traffic remains online", "admin account temporarily suspended", "monitoring continues through kickoff"],
    prompt: "Write a short status update to operations. Clear beats fancy.",
    modelAnswer:
      "Ticketing traffic spike is being investigated. Suspicious bot-like traffic has been rate-limited while legitimate users remain online. A suspicious admin account has been temporarily suspended pending review. Monitoring continues through kickoff.",
    hint: "Mention impact, action taken, current status, and what is being monitored next.",
    logs: ["[19:56:05] ticketing p95 latency improving: 1720ms -> 980ms", "[19:56:10] WAF challenge rate stable", "[19:56:18] admin session revoked for temp.ops.admin"],
    playbook: ["Keep stakeholder updates short and actionable.", "Avoid technical overload unless requested.", "Include impact, actions taken, and next monitoring focus."],
    commentary: { correct: "Operation Command: clean communication. No post-match interview disasterclass.", skipped: "Operation Command: skipped communication. The technical fix helps, but the room still needs updates." },
    takeaway: "Security operations includes communication. A good update helps teams coordinate without panic.",
  },
  {
    id: "documentation",
    title: "Incident documentation",
    type: "choice",
    alert: "Closeout checklist",
    severity: "Medium",
    affected: "incident record",
    briefing: "The immediate pressure is down. Before the room exhales, leave a clean trail for the next shift.",
    evidence: ["traffic controls applied", "admin access contained", "operations update sent", "monitoring remains active"],
    prompt: "What should be documented before closing the incident?",
    choices: [
      { label: "Timeline, evidence, actions taken, impact, and next steps", correct: true, feedback: "Correct. That creates a usable record for review and future playbook improvement." },
      { label: "Only the final status", feedback: "Not enough. Future reviewers need evidence, timeline, impact, and actions taken." },
      { label: "Nothing if service looks normal now", feedback: "Service recovery does not replace documentation." },
      { label: "Delete temporary notes and logs", feedback: "No. Keep evidence according to incident handling needs." },
    ],
    hint: "Think like an analyst handing this to the next shift.",
    logs: ["[20:02:30] incident_state=contained", "[20:02:32] evidence_bundle=logs,waf_actions,account_activity,ops_update", "[20:02:35] next_shift_monitoring=true"],
    playbook: ["Create a timeline.", "Record evidence and actions taken.", "Document business impact and follow-up items."],
    commentary: {
      correct: "Operation Command: stoppage time composure. Document everything before the whistle.",
      wrong: "Operation Command: almost there. A clean sheet still needs a match report.",
      skipped: "Operation Command: skipped documentation. The auditors just entered the chat.",
    },
    takeaway: "Incident documentation turns a response into reusable operational knowledge.",
  },
];

function newLine(kind: FeedKind, text: string): FeedLine {
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, kind, text };
}

function lineClass(kind: FeedKind) {
  switch (kind) {
    case "command":
      return "text-[#49f28a]";
    case "analyst":
      return "text-white";
    case "commentary":
      return "text-[#f8c14d]";
    case "success":
      return "text-emerald-300";
    case "warning":
      return "text-orange-300";
    default:
      return "text-white/64";
  }
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim();
}

function LogoMark() {
  return (
    <pre className="select-none whitespace-pre text-[10px] leading-[0.78rem] text-[#49f28a] sm:text-xs sm:leading-[0.9rem]" aria-hidden="true">
{`   __  __ ____  ____
  |  \/  |  _ \/ ___|
  | |\/| | | | \___ \\
  | |  | | |_| |___) |
  |_|  |_|____/|____/`}
    </pre>
  );
}

export function MatchdaySecTerminal() {
  const [nameInput, setNameInput] = useState("");
  const [analystName, setAnalystName] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [missionComplete, setMissionComplete] = useState(false);
  const [input, setInput] = useState("");
  const [feed, setFeed] = useState<FeedLine[]>([
    newLine("system", "booting matchdaysec terminal..."),
    newLine("system", "operation-command socket established"),
    newLine("system", "awaiting analyst identification"),
  ]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [skipsUsed, setSkipsUsed] = useState(0);
  const [answeredSteps, setAnsweredSteps] = useState<Record<string, "correct" | "wrong" | "skipped" | "submitted">>({});
  const [records, setRecords] = useState<ActionRecord[]>([]);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [unlockedLogs, setUnlockedLogs] = useState<Record<string, boolean>>({});
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  const currentStep = missionSteps[stepIndex];
  const stepAnswered = Boolean(answeredSteps[currentStep.id]);
  const logsRequired = currentStep.type === "choiceWithLogs";
  const logsReady = !logsRequired || unlockedLogs[currentStep.id];
  const completedCount = records.length;
  const scorePoints = records.filter((record) => record.result === "correct" || record.result === "submitted").length;
  const scorePercent = Math.round((scorePoints / missionSteps.length) * 100);
  const correctCount = records.filter((record) => record.result === "correct" || record.result === "submitted").length;
  const wrongCount = records.filter((record) => record.result === "wrong").length;
  const lastRecord = records[records.length - 1];
  const hiddenFeedCount = Math.max(feed.length - 14, 0);
  const visibleFeed = showFullHistory ? feed : feed.slice(-14);

  const commandSuggestions = useMemo(() => {
    if (!input.startsWith("/")) return [];
    return commands.filter((item) => item.command.startsWith(input.toLowerCase())).slice(0, 8);
  }, [input]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [feed, stepIndex, missionComplete]);

  function append(...lines: FeedLine[]) {
    setFeed((prev) => [...prev, ...lines]);
  }

  function startMission(event: FormEvent) {
    event.preventDefault();
    const cleanName = nameInput.trim() || "Analyst";
    setAnalystName(cleanName);
    setStepIndex(0);
    setMissionComplete(false);
    setHintsUsed(0);
    setSkipsUsed(0);
    setAnsweredSteps({});
    setRecords([]);
    setUnlockedLogs({});
    setShowFullHistory(false);
    if (typeof window !== "undefined") window.sessionStorage.setItem("matchdaysec-analyst", cleanName);
    setFeed([
      newLine("command", `whois this? ${cleanName}`),
      newLine("success", `ACCESS GRANTED: Analyst ${cleanName}`),
      newLine("system", "Operation Command: we need you to keep our matchday live."),
      newLine("system", "Ticketing is under pressure. DNS is flashing warnings. A privileged-access alert is waiting in the queue."),
      newLine("system", "Read the evidence, use the commands, and make the safest call."),
      newLine("system", "Type /help or press the command chips when you need options."),
    ]);
  }

  function showCommandMenu() {
    append(newLine("command", "/help"), newLine("system", "available commands:"), ...commands.map((item) => newLine("system", `${item.command.padEnd(11)} ${item.description}`)));
  }

  function showLogs(step = currentStep) {
    if (!step.logs?.length) {
      append(newLine("command", "/logs"), newLine("warning", "no detailed logs attached to this step yet"));
      return;
    }
    setUnlockedLogs((prev) => ({ ...prev, [step.id]: true }));
    append(newLine("command", "/logs"), newLine("system", `log feed opened: ${step.title}`), ...step.logs.map((log) => newLine("system", log)));
  }

  function showStatus() {
    append(newLine("command", "/status"), newLine("system", "current service health:"), ...serviceHealth.map((service) => newLine("system", `${service.name.padEnd(12)} ${service.signal.padEnd(5)} ${service.status}`)));
  }

  function showPlaybook(step = currentStep) {
    append(newLine("command", "/playbook"), newLine("system", `playbook notes: ${step.title}`), ...step.playbook.map((item) => newLine("system", `- ${item}`)));
  }

  function showBrief() {
    append(
      newLine("command", "/brief"),
      newLine("system", "mission: keep matchday public services online through kickoff"),
      newLine("system", "role: on-call analyst in a guided SOC/NOC learning mission"),
      newLine("system", "method: check evidence, review logs, contain carefully, communicate clearly")
    );
  }

  function useHint() {
    setHintsUsed((count) => count + 1);
    append(newLine("command", "/hint"), newLine("commentary", `Operation Command: ${currentStep.hint}`));
  }

  function clearFeed() {
    setFeed([newLine("system", "terminal cleared; operation-command remains connected")]);
  }

  function goNext() {
    setInput("");
    if (stepIndex >= missionSteps.length - 1) {
      setMissionComplete(true);
      append(newLine("success", `MISSION COMPLETE: ${analystName}, matchday stayed online.`));
      return;
    }
    const nextStep = missionSteps[stepIndex + 1];
    setStepIndex((index) => index + 1);
    append(newLine("system", `next alert loaded: ${nextStep.title}`));
  }

  function skipStep() {
    const record: ActionRecord = {
      stepId: currentStep.id,
      title: currentStep.title,
      prompt: currentStep.prompt,
      answer: "Skipped",
      result: "skipped",
      feedback: "Task skipped.",
      commentary: currentStep.commentary.skipped,
      takeaway: currentStep.takeaway,
    };
    setSkipsUsed((count) => count + 1);
    setAnsweredSteps((prev) => ({ ...prev, [currentStep.id]: "skipped" }));
    setRecords((prev) => [...prev, record]);
    append(newLine("command", "/skip"), newLine("warning", currentStep.commentary.skipped), newLine("system", `takeaway: ${currentStep.takeaway}`));
    goNext();
  }

  function executeCommand(raw: string) {
    const value = raw.toLowerCase().trim();
    switch (value) {
      case "/help":
        showCommandMenu();
        break;
      case "/hint":
        useHint();
        break;
      case "/logs":
        showLogs();
        break;
      case "/status":
        showStatus();
        break;
      case "/playbook":
        showPlaybook();
        break;
      case "/brief":
        showBrief();
        break;
      case "/whoami":
        append(newLine("command", "/whoami"), newLine("system", `analyst=${analystName || "unassigned"}`), newLine("system", `current_step=${currentStep.title}`));
        break;
      case "/skip":
        skipStep();
        break;
      case "/clear":
        clearFeed();
        break;
      default:
        append(newLine("command", value), newLine("warning", "command not recognized; type /help"));
    }
  }

  function choose(choice: Choice) {
    if (stepAnswered) return;
    const result = choice.correct ? "correct" : "wrong";
    const commentary = choice.correct ? currentStep.commentary.correct : currentStep.commentary.wrong || "Operation Command: review the evidence and try again next shift.";
    const record: ActionRecord = {
      stepId: currentStep.id,
      title: currentStep.title,
      prompt: currentStep.prompt,
      answer: choice.label,
      result,
      feedback: choice.feedback,
      commentary,
      takeaway: currentStep.takeaway,
    };
    setAnsweredSteps((prev) => ({ ...prev, [currentStep.id]: result }));
    setRecords((prev) => [...prev, record]);
    append(
      newLine("analyst", `selected: ${choice.label}`),
      newLine(choice.correct ? "success" : "warning", choice.feedback),
      newLine("commentary", commentary),
      newLine("system", `takeaway: ${currentStep.takeaway}`)
    );
    goNext();
  }

  function submitTypedAnswer(value: string) {
    const normalized = normalize(value);
    if (!normalized) return;
    if (currentStep.type === "typed") {
      const accepted = currentStep.acceptedAnswers?.some((answer) => normalized.includes(normalize(answer)));
      const result = accepted ? "correct" : "wrong";
      const feedback = accepted ? currentStep.typedFeedback || "accepted" : "not quite; Operation Command needs the service name shown in the logs";
      const commentary = accepted ? currentStep.commentary.correct : currentStep.commentary.wrong || "Operation Command: replay that log line.";
      const record: ActionRecord = {
        stepId: currentStep.id,
        title: currentStep.title,
        prompt: currentStep.prompt,
        answer: value,
        result,
        feedback,
        commentary,
        takeaway: currentStep.takeaway,
      };
      setAnsweredSteps((prev) => ({ ...prev, [currentStep.id]: result }));
      setRecords((prev) => [...prev, record]);
      append(
        newLine("analyst", value),
        newLine(accepted ? "success" : "warning", feedback),
        newLine("commentary", commentary),
        newLine("system", `takeaway: ${currentStep.takeaway}`)
      );
      goNext();
      return;
    }
    if (currentStep.type === "freeform") {
      const record: ActionRecord = {
        stepId: currentStep.id,
        title: currentStep.title,
        prompt: currentStep.prompt,
        answer: value,
        result: "submitted",
        feedback: "Status update received.",
        commentary: currentStep.commentary.correct,
        takeaway: currentStep.takeaway,
      };
      setAnsweredSteps((prev) => ({ ...prev, [currentStep.id]: "submitted" }));
      setRecords((prev) => [...prev, record]);
      append(
        newLine("analyst", value),
        newLine("success", "status update received"),
        newLine("system", `one clean version: ${currentStep.modelAnswer}`),
        newLine("commentary", currentStep.commentary.correct),
        newLine("system", `takeaway: ${currentStep.takeaway}`)
      );
      goNext();
    }
  }

  function submitCommandOrAnswer(event?: FormEvent) {
    event?.preventDefault();
    const value = input.trim();
    if (!value) return;
    if (value.startsWith("/")) executeCommand(value);
    else if (currentStep.type === "typed" || currentStep.type === "freeform") submitTypedAnswer(value);
    else append(newLine("analyst", value), newLine("warning", "this step needs a clickable option; type /help for commands"));
    setInput("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") submitCommandOrAnswer();
  }

  return (
    <main className="terminal-shell h-[100dvh] overflow-hidden bg-[#050607] p-2 text-white sm:p-3">
      <div className="terminal-window mx-auto flex h-full max-w-[1560px] flex-col overflow-hidden rounded-2xl border border-[#1f3b2f] bg-[#050806] shadow-[0_0_0_1px_rgba(73,242,138,0.06),0_28px_90px_rgba(0,0,0,0.7)]">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#1f3b2f] bg-[#07100b] px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            </div>
            <div className="hidden text-xs font-bold text-white/45 sm:block">matchdaysec@operation-command:~</div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#49f28a] sm:hidden">MDS</div>
          </div>
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/44 sm:text-xs">
            <a href={HUB_URL} className="rounded px-2 py-1 hover:bg-white/10 hover:text-white">hub</a>
            <button onClick={() => executeCommand("/status")} className="rounded px-2 py-1 hover:bg-white/10 hover:text-white">status</button>
            <button onClick={() => executeCommand("/help")} className="rounded px-2 py-1 hover:bg-white/10 hover:text-white">help</button>
          </nav>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-0 flex-1 flex-col border-[#1f3b2f] lg:border-r">
            <div className="status-strip shrink-0 border-b border-[#1f3b2f] bg-[#06100b] p-2 lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {serviceHealth.map((service) => (
                  <span key={service.name} className={`shrink-0 rounded border px-2.5 py-1.5 text-[10px] font-black uppercase ${service.signal === "OK" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-[#f8c14d]/25 bg-[#f8c14d]/10 text-[#f8c14d]"}`}>
                    {service.name}: {service.signal}
                  </span>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
              {!analystName ? (
                <section className="flex min-h-full items-center justify-center">
                  <div className="w-full max-w-3xl">
                    <LogoMark />
                    <div className="mt-6 space-y-3 text-sm leading-7 text-white/68 sm:text-base">
                      <p><span className="text-[#49f28a]">operation-command$</span> boot --mission operation-kickoff</p>
                      <p>We need you to keep our matchday live.</p>
                      <p>Ticketing is under pressure. DNS is flashing warnings.</p>
                      <p> A privileged-access alert is waiting in the queue.</p>
                    </div>

                    <form onSubmit={startMission} className="mt-8 rounded-xl border border-[#1f3b2f] bg-black/35 p-4 sm:p-5">
                      <label htmlFor="analyst-name" className="block text-sm text-white/58">
                        <span className="text-[#49f28a]">> whoami</span>
                      </label>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <input
                          id="analyst-name"
                          value={nameInput}
                          onChange={(event) => setNameInput(event.target.value)}
                          placeholder="enter name"
                          className="min-h-12 flex-1 border border-[#1f3b2f] bg-[#030504] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/22 focus:border-[#49f28a]"
                        />
                        <button className="min-h-12 border border-[#49f28a]/50 bg-[#49f28a] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black hover:bg-[#80ffb5]">
                          enter
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/42">
                    <span className="rounded border border-[#1f3b2f] bg-black/30 px-2 py-1">analyst={analystName}</span>
                    <span className="rounded border border-[#1f3b2f] bg-black/30 px-2 py-1">mission=operation_kickoff</span>
                    <span className="rounded border border-[#1f3b2f] bg-black/30 px-2 py-1">step={Math.min(stepIndex + 1, missionSteps.length)}/{missionSteps.length}</span>
                  </div>

                  <div className="space-y-2 text-sm leading-7">
                    {hiddenFeedCount > 0 && (
                      <button
                        onClick={() => setShowFullHistory((value) => !value)}
                        className="mb-2 border border-[#1f3b2f] bg-black/25 px-3 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-white/42 hover:border-[#49f28a]/40 hover:text-[#49f28a]"
                      >
                        {showFullHistory ? "hide terminal history" : `show ${hiddenFeedCount} older terminal lines`}
                      </button>
                    )}
                    {visibleFeed.map((line) => (
                      <p key={line.id} className={`${lineClass(line.kind)} break-words`}>
                        <span className="select-none text-white/24">{line.kind === "command" ? "$" : line.kind === "analyst" ? ">" : "::"}</span>{" "}
                        {line.text}
                      </p>
                    ))}
                    <div ref={feedEndRef} />
                  </div>

                  {lastRecord && !missionComplete && (
                    <details open className="mt-5 rounded-xl border border-[#1f3b2f] bg-black/24 p-4">
                      <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.18em] text-white/44 hover:text-[#49f28a]">
                        previous call // {lastRecord.title}
                      </summary>
                      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.85fr]">
                        <div>
                          <p className="text-sm font-bold leading-6 text-white">{lastRecord.prompt}</p>
                          <p className="mt-2 text-sm leading-6 text-white/58"><span className="text-[#49f28a]">you chose:</span> {lastRecord.answer}</p>
                        </div>
                        <div className="border border-[#1f3b2f] bg-[#030504] p-3">
                          <p className={lastRecord.result === "correct" || lastRecord.result === "submitted" ? "text-sm font-black text-emerald-300" : lastRecord.result === "skipped" ? "text-sm font-black text-orange-300" : "text-sm font-black text-[#f8c14d]"}>
                            {lastRecord.result.toUpperCase()}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-white/58">{lastRecord.feedback}</p>
                          <p className="mt-2 text-xs leading-5 text-[#f8c14d]">{lastRecord.commentary}</p>
                        </div>
                      </div>
                    </details>
                  )}

                  {!missionComplete && (
                    <section className="mt-5 rounded-xl border border-[#1f3b2f] bg-[#07100b]/78 p-4 sm:p-5">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f8c14d]">current task</p>
                          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">{currentStep.title}</h1>
                          {currentStep.alert && <p className="mt-1 text-xs text-white/42">alert: <span className="text-white/72">{currentStep.alert}</span></p>}
                        </div>
                        {currentStep.severity && <span className="w-fit border border-[#f8c14d]/35 bg-[#f8c14d]/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#f8c14d]">{currentStep.severity}</span>}
                      </div>

                      <p className="mt-4 text-sm leading-7 text-white/68">{currentStep.briefing}</p>

                      {currentStep.evidence && (
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {currentStep.evidence.map((item) => (
                            <div key={item} className="border border-[#1f3b2f] bg-black/28 px-3 py-2 text-xs leading-5 text-white/58">
                              <span className="text-[#49f28a]">›</span> {item}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-5 border-l-2 border-[#49f28a]/55 bg-[#49f28a]/[0.045] px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#49f28a]">operation command</p>
                        <p className="mt-2 text-base font-bold leading-7 text-white">{currentStep.prompt}</p>
                      </div>

                      {logsRequired && !logsReady && (
                        <div className="mt-4 text-sm leading-7 text-[#f8c14d]">
                          Run <button onClick={() => executeCommand("/logs")} className="underline decoration-dotted underline-offset-4">/logs</button> to unlock this decision.
                        </div>
                      )}

                      {currentStep.choices && logsReady && (
                        <div className="mt-4 grid gap-2 md:grid-cols-2">
                          {currentStep.choices.map((choice, index) => (
                            <button key={choice.label} disabled={stepAnswered} onClick={() => choose(choice)} className="choice-button border border-[#1f3b2f] bg-black/32 px-3 py-3 text-left text-sm leading-6 text-white/72 hover:border-[#49f28a]/55 hover:bg-[#49f28a]/[0.055] disabled:cursor-not-allowed disabled:opacity-45">
                              <span className="mr-2 text-[#49f28a]">[{String.fromCharCode(65 + index)}]</span>{choice.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {currentStep.type === "freeform" && !stepAnswered && <p className="mt-4 text-xs leading-6 text-white/42">Type the update in the terminal input below. Keep it clear and calm.</p>}

                    </section>
                  )}

                  {missionComplete && (
                    <section id="debrief" className="mt-6 rounded-xl border border-[#49f28a]/30 bg-[#07100b]/78 p-5 sm:p-6">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#49f28a]">mission debrief</p>
                      <h1 className="mt-3 text-3xl font-black sm:text-5xl">Matchday stayed online.</h1>
                      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/68">
                        {analystName}, you completed Operation Kickoff. This guided mission practiced triage, log review, careful containment, communication, and documentation.
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-4">
                        <div className="border border-[#49f28a]/30 bg-[#49f28a]/[0.06] p-4"><p className="text-xs text-white/42">score</p><p className="mt-1 text-3xl font-black text-[#49f28a]">{scorePercent}%</p></div>
                        <div className="border border-[#1f3b2f] bg-black/28 p-4"><p className="text-xs text-white/42">steps</p><p className="mt-1 text-2xl font-black">{completedCount}/{missionSteps.length}</p></div>
                        <div className="border border-[#1f3b2f] bg-black/28 p-4"><p className="text-xs text-white/42">correct / submitted</p><p className="mt-1 text-2xl font-black text-emerald-300">{correctCount}</p></div>
                        <div className="border border-[#1f3b2f] bg-black/28 p-4"><p className="text-xs text-white/42">hints / skips</p><p className="mt-1 text-2xl font-black text-[#f8c14d]">{hintsUsed}/{skipsUsed}</p></div>
                      </div>
                      <div className="mt-3 text-xs leading-5 text-white/42">Wrong calls: {wrongCount}. Skipped calls: {skipsUsed}. Score is based on completed mission tasks, not speed.</div>
                      <div className="mt-5 border border-[#1f3b2f] bg-black/28 p-4">
                        <h2 className="font-black text-white">What this demonstrates</h2>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-white/62">
                          <li>› SOC/NOC triage and alert prioritization</li>
                          <li>› Service health interpretation</li>
                          <li>› Log review and suspicious traffic recognition</li>
                          <li>› Account compromise response</li>
                          <li>› Stakeholder communication and incident documentation</li>
                        </ul>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            {analystName && !missionComplete && (
              <div className="shrink-0 border-t border-[#1f3b2f] bg-[#07100b] p-2 sm:p-3">
                {commandSuggestions.length > 0 && (
                  <div className="mb-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
                    {commandSuggestions.map((item) => (
                      <button key={item.command} onClick={() => { setInput(item.command); executeCommand(item.command); setInput(""); }} className="border border-[#1f3b2f] bg-black/35 px-2 py-1.5 text-left text-[11px] text-white/50 hover:border-[#49f28a]/50 hover:text-white">
                        <span className="font-black text-[#49f28a]">{item.command}</span> <span>{item.description}</span>
                      </button>
                    ))}
                  </div>
                )}
                <form onSubmit={submitCommandOrAnswer} className="flex items-center gap-2">
                  <span className="hidden text-sm font-black text-[#49f28a] sm:inline">{analystName.toLowerCase()}@warroom:~$</span>
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentStep.type === "freeform" ? "write update or type / for commands" : currentStep.type === "typed" ? "type answer or / for commands" : "type / for commands"}
                    className="min-h-11 flex-1 border border-[#1f3b2f] bg-[#030504] px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/24 focus:border-[#49f28a]"
                  />
                  <button className="min-h-11 border border-[#49f28a]/50 bg-[#49f28a] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black hover:bg-[#80ffb5]">send</button>
                </form>
              </div>
            )}
          </section>

          <aside className="hidden min-h-0 overflow-y-auto bg-[#06100b] p-4 lg:block">
            <div className="mb-5">
              <LogoMark />
              <p className="mt-3 text-xs leading-6 text-white/42">operation-command side panel // service health, shortcuts, and current incident context</p>
            </div>

            <section className="mb-5 border border-[#1f3b2f] bg-black/24 p-3">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-white/38">service health</p>
              <div className="space-y-2">
                {serviceHealth.map((service) => (
                  <div key={service.name} className="flex items-center justify-between border border-[#1f3b2f] bg-[#030504] px-3 py-2">
                    <span className="text-xs font-bold text-white/62">{service.label}</span>
                    <span className={service.signal === "OK" ? "text-xs font-black text-emerald-300" : "text-xs font-black text-[#f8c14d]"}>{service.signal}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-5 border border-[#1f3b2f] bg-black/24 p-3">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-white/38">quick commands</p>
              <div className="grid grid-cols-2 gap-2">
                {["/help", "/hint", "/logs", "/status", "/playbook", "/skip"].map((cmd) => (
                  <button key={cmd} onClick={() => executeCommand(cmd)} className="border border-[#1f3b2f] bg-[#030504] px-2 py-2 text-left text-xs font-black text-white/62 hover:border-[#49f28a]/50 hover:text-[#49f28a]">
                    {cmd}
                  </button>
                ))}
              </div>
            </section>

            {analystName && !missionComplete && (
              <section className="border border-[#1f3b2f] bg-black/24 p-3">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-white/38">current alert</p>
                <p className="text-sm font-black text-white">{currentStep.title}</p>
                <p className="mt-2 text-xs leading-5 text-white/48">{currentStep.alert}</p>
                <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[#f8c14d]">{currentStep.severity} severity</p>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
