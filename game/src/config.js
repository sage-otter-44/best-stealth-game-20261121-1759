// SHADOW VAULT — tuning constants. One job: every number the game balances on.
// Canvas is 1280x800, tile 40px, grid 32x20. All speeds are px per second.
export const TILE = 40;
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const GRID_W = 32;
export const GRID_H = 20;

export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 165;
export const PLAYER_SNEAK_SPEED = 95;
export const PLAYER_SPRINT_SPEED = 245;

export const GUARD_RADIUS = 14;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 178;
export const GUARD_INVESTIGATE_SPEED = 110;
export const GUARD_CATCH_RADIUS = 20;

// Vision: cone range in px, half-angle in radians.
export const CONE_RANGE = 215;
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const CONE_RAYS = 26;

// Detection: suspicion 0..100. Rates per second at point-blank vs at cone edge.
export const SPOT_RATE_CLOSE = 95;
export const SPOT_RATE_FAR = 26;
export const SPOT_SNEAK_FACTOR = 0.45;
export const SPOT_SPRINT_FACTOR = 1.8;
export const SPOT_COVER_FACTOR = 0.12; // hiding in a bush / behind a crate
export const SPOT_COVER_CLOSE_RANGE = 70; // even in cover, this close you are seen
export const SUSPICION_DECAY = 14; // per second while unseen
export const ALARM_AT = 100; // suspicion hits this -> alarm
export const SUSPICIOUS_AT = 45; // guard turns and stares
export const ALARM_LOSE_SIGHT_AFTER = 3.0; // seconds unseen before alarm cools
export const SEARCH_TIME = 4.0; // seconds a guard hunts the last seen spot

export const NOISE_SPRINT_RADIUS = 190; // guards inside this hear a sprint
export const NOISE_LURE_RADIUS = 230; // guards inside this walk to a thrown coin
export const LURES_PER_LEVEL = 3;
export const LURE_FLIGHT_TIME = 0.45;

export const SCORE_CORE = 250;
export const SCORE_KEYCARD = 150;
export const SCORE_LEVEL_CLEAR = 1000;
export const SCORE_UNSEEN_BONUS = 500; // finishing a level never spotted
export const SCORE_TIME_BONUS_PER_SECOND = 10; // under par time

export const LEVEL_PAR_SECONDS = [75, 90, 105, 120, 135];
