import { describe, it, expect } from "vitest";
import { isInsideGCC } from "@/lib/gccBoundary";
import { wardFor, zoneForArea } from "@/lib/gccWards";
import { daysOpen, isSlaBreached, SLA_DAYS } from "@/data/civic";

describe("CivicLens Core Logic & Mathematical Guarantees", () => {
    // 1. Boundary Lock Tests
    describe("GCC Boundary Enforcer (isInsideGCC)", () => {
        it("accepts valid Chennai coordinates (Ripon Building)", () => {
            expect(isInsideGCC(13.0827, 80.2707)).toBe(true);
        });

        it("accepts southern ward point (Sholinganallur)", () => {
            expect(isInsideGCC(12.901, 80.2279)).toBe(true);
        });

        it("rejects coordinates outside GCC (Bengaluru)", () => {
            expect(isInsideGCC(12.9716, 77.5946)).toBe(false);
        });

        it("rejects coordinates in the Bay of Bengal", () => {
            expect(isInsideGCC(13.0827, 80.4500)).toBe(false);
        });
    });

    // 2. Spatial Ward Derivation Tests
    describe("Ward Point-in-Polygon Engine (wardFor)", () => {
        it("derives Ward & Zone for T. Nagar", () => {
            const result = wardFor(13.0418, 80.2341);
            expect(result).not.toBeNull();
            expect(result?.ward).toBeGreaterThan(0);
            expect(result?.ward).toBeLessThanOrEqual(200);
            expect(result?.zone).toBeGreaterThan(0);
        });

        it("returns null for points strictly outside GCC", () => {
            expect(wardFor(10.0, 70.0)).toBeNull();
        });
    });

    // 3. Zone Area Matcher Tests
    describe("Zone Area Parser (zoneForArea)", () => {
        it("parses valid 'Ward 142' strings", () => {
            const z = zoneForArea("Ward 142");
            expect(z).not.toBeNull();
            expect(z?.zone).toBeGreaterThan(0);
        });

        it("returns null for unformatted area strings", () => {
            expect(zoneForArea("Chennai")).toBeNull();
            expect(zoneForArea("Random Landmark")).toBeNull();
        });
    });

    // 4. SLA & Timing Rule Tests
    describe("SLA Calculation Math", () => {
        it("calculates zero days open for today's reports", () => {
            const today = new Date().toISOString().slice(0, 10);
            expect(daysOpen({ date: today })).toBe(0);
        });

        it("correctly identifies SLA breach at or above 7 days", () => {
            const eightDaysAgo = new Date();
            eightDaysAgo.setDate(eightDaysAgo.getDate() - (SLA_DAYS + 1));
            const dateStr = eightDaysAgo.toISOString().slice(0, 10);

            expect(isSlaBreached({ date: dateStr, status: "Unresolved" })).toBe(true);
        });

        it("never flags resolved complaints as SLA breached", () => {
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
            const dateStr = tenDaysAgo.toISOString().slice(0, 10);

            expect(isSlaBreached({ date: dateStr, status: "Resolved" })).toBe(false);
        });
    });
});