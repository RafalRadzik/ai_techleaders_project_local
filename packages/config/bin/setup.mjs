#!/usr/bin/env node
/** `npm run setup`: idempotent local-development setup (see `../src/setup/setup.mjs`). */
import { main } from "../src/setup/system.mjs";

process.exitCode = await main();
