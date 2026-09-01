// Generates a live, subscribable .ics calendar feed of the league (or one team's) schedule.
// GET /api/calendar            -> every game in the league
// GET /api/calendar?team=slug  -> only that team's games (home + away)
//
// Calendar apps (Apple Calendar, Outlook, Google Calendar "From URL") can subscribe to
// this URL directly and will periodically re-fetch it, so it stays current as scores
// and game times are updated on the site — no manual re-download needed.

function pad(n) { return String(n).padStart(2, "0"); }

function parseGameTime(dateStr, timeStr) {
  // dateStr: "2026-09-13"  timeStr: "8:30am" / "12:30pm"
  var m = /^(\d{1,2}):(\d{2})\s*([ap]m)$/i.exec((timeStr || "").trim());
  var hh = 0, mm = 0;
  if (m) {
    hh = parseInt(m[1], 10) % 12;
    mm = parseInt(m[2], 10);
    if (m[3].toLowerCase() === "pm") hh += 12;
  }
  var parts = dateStr.split("-").map(Number);
  return { y: parts[0], mo: parts[1], d: parts[2], hh: hh, mm: mm };
}

function icsLocalStamp(t) {
  return "" + t.y + pad(t.mo) + pad(t.d) + "T" + pad(t.hh) + pad(t.mm) + "00";
}

function addMinutes(t, minutes) {
  var dt = new Date(Date.UTC(t.y, t.mo - 1, t.d, t.hh, t.mm));
  dt.setUTCMinutes(dt.getUTCMinutes() + minutes);
  return {
    y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(),
    hh: dt.getUTCHours(), mm: dt.getUTCMinutes()
  };
}

function foldLine(line) {
  // RFC 5545 recommends folding lines longer than 75 octets.
  if (line.length <= 75) return line;
  var out = [];
  var i = 0;
  while (i < line.length) {
    out.push((i === 0 ? "" : " ") + line.slice(i, i + 74));
    i += 74;
  }
  return out.join("\r\n");
}

function escText(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function onRequestGet({ request, env }) {
  var url = new URL(request.url);
  var teamSlug = url.searchParams.get("team");

  var state;
  try {
    var stateRes = await fetch(new URL("/api/state", url.origin));
    state = await stateRes.json();
  } catch (e) {
    return new Response("Could not load league schedule.", { status: 502 });
  }

  var team = teamSlug ? (state.teams || []).find(function (t) { return t.slug === teamSlug; }) : null;
  if (teamSlug && !team) {
    return new Response("Unknown team.", { status: 404 });
  }

  var games = (state.schedule || []).filter(function (g) {
    return !team || g.home === team.name || g.away === team.name;
  });

  var calName = team ? (team.name + " — " + (state.leagueShort || state.leagueName)) : (state.leagueShort || state.leagueName) + " — Full Schedule";

  var now = new Date();
  var dtstamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate())
    + "T" + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + "Z";

  var lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//" + (state.leagueShort || "GMHL") + "//Schedule//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(foldLine("X-WR-CALNAME:" + escText(calName)));
  lines.push("X-WR-TIMEZONE:America/Toronto");
  lines.push("REFRESH-INTERVAL;VALUE=DURATION:PT6H");
  lines.push("X-PUBLISHED-TTL:PT6H");

  games.forEach(function (g) {
    var start = parseGameTime(g.date, g.time);
    var end = addMinutes(start, 60);
    var played = g.hg != null && g.ag != null;
    var title = g.home + " vs " + g.away;
    if (team) {
      title = (g.home === team.name ? team.name + " vs " + g.away : team.name + " @ " + g.home);
    }
    var desc = played ? ("Final: " + g.home + " " + g.hg + " - " + g.ag + " " + g.away + (g.ot ? " (OT)" : "")) : "";

    lines.push("BEGIN:VEVENT");
    lines.push("UID:gmhl-game-" + g.id + "@" + url.hostname);
    lines.push("DTSTAMP:" + dtstamp);
    lines.push("DTSTART;TZID=America/Toronto:" + icsLocalStamp(start));
    lines.push("DTEND;TZID=America/Toronto:" + icsLocalStamp(end));
    lines.push(foldLine("SUMMARY:" + escText(title)));
    if (g.venue) lines.push(foldLine("LOCATION:" + escText(g.venue)));
    if (desc) lines.push(foldLine("DESCRIPTION:" + escText(desc)));
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="' + (team ? team.slug : "gmhl") + '-schedule.ics"',
      "cache-control": "public, max-age=300"
    }
  });
}
