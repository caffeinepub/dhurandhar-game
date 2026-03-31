import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";

module {
  type ScoreEntry = {
    name : Text;
    score : Nat;
  };

  type OldActor = {
    highScoresList : List.List<ScoreEntry>;
  };

  type NewActor = {
    leaderboard : [(Text, Nat)];
  };

  public func run(old : OldActor) : NewActor {
    // Drop all persistent state
    { leaderboard = [] };
  };
};
