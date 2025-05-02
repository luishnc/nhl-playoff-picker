import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [matchups, setMatchups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState("");
  const [championPick, setChampionPick] = useState("");
  const [userPicks, setUserPicks] = useState({});
  const [userGames, setUserGames] = useState({});
  const [submissions, setSubmissions] = useState(() => {
    const stored = localStorage.getItem("nhl_submissions");
    return stored ? JSON.parse(stored) : [];
  });
  const [activeRound, setActiveRound] = useState(1);

  useEffect(() => {
    fetch("https://api-web.nhle.com/v1/playoff-series/carousel/20242025/")
      .then((res) => res.json())
      .then((data) => {
        const allRounds = data.rounds.flatMap((r) =>
          r.series.map((series) => ({ ...series, roundNumber: r.roundNumber }))
        );

        const formattedMatchups = allRounds.map((series, index) => {
          const winner =
            series.winningTeamId === series.topSeed.id
              ? series.topSeed.abbrev
              : series.winningTeamId === series.bottomSeed.id
              ? series.bottomSeed.abbrev
              : null;

          return {
            id: index,
            round: series.roundNumber,
            teamA: series.topSeed.abbrev,
            teamB: series.bottomSeed.abbrev,
            logoA: series.topSeed.logo,
            logoB: series.bottomSeed.logo,
            winsA: series.topSeed.wins,
            winsB: series.bottomSeed.wins,
            neededToWin: series.neededToWin,
            winner,
            status: series.winningTeamId
              ? `${series.topSeed.wins}-${series.bottomSeed.wins} (Final)`
              : `${series.topSeed.wins}-${series.bottomSeed.wins} (In Progress)`
          };
        });

        setMatchups(formattedMatchups);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load data");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("nhl_submissions", JSON.stringify(submissions));
  }, [submissions]);

  function handlePick(matchId, team) {
    setUserPicks((prev) => ({ ...prev, [matchId]: team }));
  }

  function handleGames(matchId, value) {
    setUserGames((prev) => ({ ...prev, [matchId]: value }));
  }

  function handleSubmit() {
    if (!username || !championPick) {
      alert("Please enter your name and champion pick.");
      return;
    }

    const requiredMatchups = matchups.filter((m) => m.round === activeRound);
    for (let match of requiredMatchups) {
      if (!userPicks[match.id] || !userGames[match.id]) {
        alert("Please complete all picks with the number of games for each matchup.");
        return;
      }
    }

    const newEntry = {
      name: username,
      picks: userPicks,
      games: userGames,
      champion: championPick,
      round: activeRound,
      score: calculateScore()
    };

    setSubmissions((prev) => [...prev, newEntry]);
    setUsername("");
    setChampionPick("");
    setUserPicks({});
    setUserGames({});
  }

  function calculateScore() {
    const r1Matchups = matchups.filter((m) => m.round === 1);
    const baseScore = r1Matchups.reduce((acc, match) => {
      const pickedTeam = userPicks[match.id];
      const gamesPicked = userGames[match.id];
      const pickedWinner = pickedTeam === match.winner;
      const isUnderdog = pickedTeam === match.teamB;
      const exactGames = pickedWinner && match.winsA + match.winsB === Number(gamesPicked);

      if (pickedWinner) {
        const base = isUnderdog ? 3 : 2;
        const bonus = exactGames ? 1 : 0;
        return acc + base + bonus;
      }
      return acc;
    }, 0);

    const championWon = matchups.some(
      (m) => m.winner === championPick && m.status.includes("Final")
    );
    return baseScore + (championWon ? 5 : 0);
  }

  const roundsAvailable = [...new Set(matchups.map((m) => m.round))];
  const allTeams = [...new Set(matchups.flatMap((m) => [m.teamA, m.teamB]))];

  return (
    <div className="App">
      <div className="header-bar">
        <h1 className="title">🏒 NHL Playoff Picker</h1>
      </div>

      <div style={{ marginBottom: 20 }}>
        {roundsAvailable.map((r) => (
          <button
            key={r}
            onClick={() => setActiveRound(r)}
            style={{
              marginRight: 10,
              background: r === activeRound ? "#1976d2" : "#ccc",
              color: "white",
              padding: "5px 10px",
              border: "none",
              borderRadius: 4
            }}
          >
            Round {r}
          </button>
        ))}
      </div>

      <section className="section-picks">
        <div className="form">
          <label>
            Your Name:
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
            />
          </label>
        </div>

        <div className="form">
          <label>
            Pick the Stanley Cup Champion:
            <select value={championPick} onChange={(e) => setChampionPick(e.target.value)}>
              <option value="">Select a team</option>
              {allTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="matchups">
          {matchups
            .filter((m) => m.round === activeRound)
            .map((match) => (
              <div key={match.id} className="matchup small">
                <div className="team">
                  <img src={match.logoA} alt={match.teamA} height="40" />
                  <p className="team-name">{match.teamA} (Home)</p>
                  <small>{match.winsA} wins</small>
                  <br />
                  <button
                    className="pick-button"
                    style={{ backgroundColor: userPicks[match.id] === match.teamA ? "#4caf50" : "" }}
                    onClick={() => handlePick(match.id, match.teamA)}
                  >
                    Pick {match.teamA}
                  </button>
                </div>
                <strong>vs</strong>
                <div className="team">
                  <img src={match.logoB} alt={match.teamB} height="40" />
                  <p className="team-name">{match.teamB} (Underdog)</p>
                  <small>{match.winsB} wins</small>
                  <br />
                  <button
                    className="pick-button"
                    style={{ backgroundColor: userPicks[match.id] === match.teamB ? "#4caf50" : "" }}
                    onClick={() => handlePick(match.id, match.teamB)}
                  >
                    Pick {match.teamB}
                  </button>
                </div>
                <div>
                  <label>
                    # of Games:
                    <input
                      type="number"
                      min="4"
                      max="7"
                      value={userGames[match.id] || ""}
                      onChange={(e) => handleGames(match.id, e.target.value)}
                    />
                  </label>
                </div>
              </div>
            ))}
        </div>

        <button onClick={handleSubmit} className="submit-button">
          ✅ Submit Picks
        </button>
      </section>
    </div>
  );
}

export default App;
