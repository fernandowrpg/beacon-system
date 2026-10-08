const COLORS = {
  move: 0x33bc4e,
  rush: 0xf1d836,
  over: 0xe72124
};

export class BeaconTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {
  _getSegmentStyle(waypoint) {
    return this.#speedStyle(waypoint, super._getSegmentStyle(waypoint));
  }

  _getGridHighlightStyle(waypoint, offset) {
    return this.#speedStyle(waypoint, super._getGridHighlightStyle(waypoint, offset));
  }

  _getWaypointLabelContext(waypoint, state) {
    const context = super._getWaypointLabelContext(waypoint, state);
    if (!context) return context;
    const units = game.i18n.localize("BEACON.Ruler.spaces");
    if ("units" in context) context.units = units;
    if (context.cost && "units" in context.cost) context.cost.units = units;
    return context;
  }

  #speedStyle(waypoint, style) {
    if (!game.settings.get("beacon", "rulerSpeedColors")) return style;
    if (CONFIG.Token.movement?.actions?.[waypoint.action]?.teleport) return style;
    const actor = this.token?.actor;
    const speed = actor?.system?.attributes?.speed;
    if (!Number.isFinite(speed)) return style;
    const cost = (waypoint.measurement?.cost ?? 0) - 0.1;
    const statuses = actor.statuses ?? new Set();
    let color;
    if (statuses.has("immobilized")) color = COLORS.over;
    else if (cost <= speed) color = COLORS.move;
    else if (cost <= speed * 2 && !statuses.has("slowed")) color = COLORS.rush;
    else color = COLORS.over;
    return { ...style, color };
  }
}
