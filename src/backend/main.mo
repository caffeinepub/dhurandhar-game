import Migration "migration";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Array "mo:core/Array";

(with migration = Migration.run)
actor {
  let MAX_LEADERBOARD_SIZE = 10;
  var leaderboard : [(Text, Nat)] = [];

  /// Submit a new high score with player's name and score.
  /// If the score is higher than the existing one or if player has no score yet,
  /// it replaces the previous score.
  public shared ({ caller }) func submitScore(name : Text, score : Nat) : async () {
    assert (name.size() > 0);

    if (tryUpdateExistingScore(name, score)) {
      return;
    };

    let newLeaderboard = mergeNewScore(name, score);
    leaderboard := Array.tabulate(
      Nat.min(MAX_LEADERBOARD_SIZE, newLeaderboard.size()),
      func(i) { newLeaderboard[i] },
    );
  };

  func tryUpdateExistingScore(name : Text, newScore : Nat) : Bool {
    switch (findScoreIndex(name)) {
      case (null) { false };
      case (?index) {
        let (_, oldScore) = leaderboard[index];
        if (newScore > oldScore) {
          leaderboard := updateScoreAtIndex(index, newScore);
        };
        true;
      };
    };
  };

  func findScoreIndex(name : Text) : ?Nat {
    leaderboard.findIndex(func((n, _)) { n == name });
  };

  func updateScoreAtIndex(index : Nat, newScore : Nat) : [(Text, Nat)] {
    Array.tabulate(
      leaderboard.size(),
      func(i) {
        if (i == index) {
          let (name, _oldScore) = leaderboard[i];
          (name, newScore);
        } else { leaderboard[i] };
      },
    );
  };

  /// Inserts the new score in the correct position in the leaderboard based on score.
  func mergeNewScore(name : Text, score : Nat) : [(Text, Nat)] {
    var inserted = false;
    var insertionIndex = leaderboard.size();

    let result = leaderboard.map(func((_, s)) { if (s < score and not inserted) { inserted := true; score } else { s } });

    if (not inserted) {
      leaderboard.concat([(name, score)]);
    } else {
      let finalResult = Array.tabulate(
        result.size(),
        func(i) {
          let (n, _) = leaderboard[i];
          if (result[i] == score) { (name, score) } else { (n, result[i]) };
        },
      );
      finalResult;
    };
  };

  public query ({ caller }) func getLeaderboard() : async [(Text, Nat)] {
    leaderboard;
  };
};
