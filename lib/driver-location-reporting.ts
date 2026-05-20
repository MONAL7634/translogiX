type AutoTrackableShipment = {
  id: string;
  status: string;
  vehicleId: string | null;
};

const AUTO_TRACKED_STATUSES = new Set(["PICKED_UP", "IN_TRANSIT"]);

export function getAutoTrackableShipments<T extends AutoTrackableShipment>(
  shipments: T[]
) {
  return shipments.filter(
    (shipment) =>
      AUTO_TRACKED_STATUSES.has(shipment.status) && Boolean(shipment.vehicleId)
  );
}

export function buildAutoTrackingPayload(coords: {
  latitude: number;
  longitude: number;
}) {
  return {
    location: "Auto GPS location",
    latitude: Number(coords.latitude.toFixed(6)),
    longitude: Number(coords.longitude.toFixed(6)),
  };
}
