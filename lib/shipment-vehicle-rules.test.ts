import assert from "node:assert/strict";
import {
  getShipmentStatusAfterVehicleAssignment,
  isActiveVehicleShipmentStatus,
  shouldReleaseVehicleForStatus,
} from "./shipment-vehicle-rules";

assert.equal(isActiveVehicleShipmentStatus("ASSIGNED"), true);
assert.equal(isActiveVehicleShipmentStatus("PICKED_UP"), true);
assert.equal(isActiveVehicleShipmentStatus("IN_TRANSIT"), true);
assert.equal(isActiveVehicleShipmentStatus("CREATED"), false);
assert.equal(isActiveVehicleShipmentStatus("DELIVERED"), false);
assert.equal(isActiveVehicleShipmentStatus("CANCELLED"), false);

assert.equal(getShipmentStatusAfterVehicleAssignment("CREATED"), "ASSIGNED");
assert.equal(getShipmentStatusAfterVehicleAssignment("IN_TRANSIT"), "IN_TRANSIT");

assert.equal(shouldReleaseVehicleForStatus("DELIVERED"), true);
assert.equal(shouldReleaseVehicleForStatus("CANCELLED"), true);
assert.equal(shouldReleaseVehicleForStatus("IN_TRANSIT"), false);
