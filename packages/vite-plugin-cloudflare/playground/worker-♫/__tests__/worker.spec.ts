import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test, vi } from "vitest";
import {
	getTextResponse,
	isBuild,
	rootDir,
	serverLogs,
	viteTestUrl,
	WAIT_FOR_OPTIONS,
} from "../../__test-utils__";

test("basic hello-world functionality", async () => {
	await vi.waitFor(
		async () => expect(await getTextResponse()).toEqual("Hello World!"),
		WAIT_FOR_OPTIONS
	);
});

test("the project path can contain a non-ascii character", async () => {
	// For context see https://github.com/cloudflare/workers-sdk/issues/10717
	expect(rootDir).toContain("♫");
});

test("preserves entry signatures", async () => {
	expect(serverLogs.info.join()).toContain("__preserves-entry-signatures__");
});

test("basic dev logging (with the default logLevel: info)", async () => {
	expect(serverLogs.info.join()).toContain("__console log__");
	expect(serverLogs.info.join()).toContain("__console debug__");
	expect(serverLogs.errors.join()).toContain("__console error__");
	expect(serverLogs.warns.join()).toContain("__console warn__");

	// Historically we've been printing warnings as errors, that's why we also include the following check
	expect(serverLogs.errors.join()).not.toContain("__console warn__");
});

test("receives the original host as the `X-Forwarded-Host` header", async () => {
	const testUrl = new URL(viteTestUrl);
	await vi.waitFor(
		async () =>
			expect(await getTextResponse("/x-forwarded-host")).toEqual(testUrl.host),
		WAIT_FOR_OPTIONS
	);
});

test("does not cause unhandled rejection", async () => {
	expect(serverLogs.errors.join()).not.toContain("__unhandled rejection__");
});

test.runIf(!isBuild)(
	"updates using HMR code in Worker entry file",
	async () => {
		// Touch the worker entry file to trigger a HMR update.
		const workerEntryPath = path.join(rootDir, "src", "index.ts");
		const originalContent = fs.readFileSync(workerEntryPath, "utf-8");
		fs.writeFileSync(workerEntryPath, originalContent);

		await vi.waitFor(() => {
			expect(serverLogs.info.join()).toContain("[vite] hot updated");
		}, WAIT_FOR_OPTIONS);
	}
);
