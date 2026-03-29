import Text "mo:core/Text";
import Order "mo:core/Order";
import List "mo:core/List";
import Runtime "mo:core/Runtime";

actor {
  type ScoreEntry = {
    name : Text;
    score : Nat;
  };

  module ScoreEntry {
    public func compare(entry1 : ScoreEntry, entry2 : ScoreEntry) : Order.Order {
      switch (Nat.compare(entry2.score, entry1.score)) {
        case (#equal) { Text.compare(entry1.name, entry2.name) };
        case (order) { order };
      };
    };
  };

  let highScoresList = List.empty<ScoreEntry>();

  func updateOrAddScore(name : Text, score : Nat) {
    var found = false;
    let newScores = highScoresList.map<ScoreEntry, ScoreEntry>(
      func(entry) {
        if (entry.name == name) {
          found := true;
          if (score > entry.score) {
            return { name; score };
          };
        };
        entry;
      }
    );

    if (found) {
      highScoresList.clear();
      highScoresList.addAll(newScores.values());
    } else {
      highScoresList.add({ name; score });
    };
  };

  public shared ({ caller }) func submitScore(name : Text, score : Nat) : async () {
    if (name.size() == 0) { Runtime.trap("Name cannot be empty") };
    switch (highScoresList.find(func(entry) { entry.name == name })) {
      case (?existing) { if (existing.score >= score) { return } };
      case (null) { () };
    };
    updateOrAddScore(name, score);
  };

  public query ({ caller }) func getLeaderboard() : async [ScoreEntry] {
    let sortedScores = highScoresList.toArray().sort();
    sortedScores.sliceToArray(0, Nat.min(10, sortedScores.size()));
  };
};
