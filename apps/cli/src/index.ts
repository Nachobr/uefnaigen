#!/usr/bin/env node
import { Command } from "commander";
import { createCommand } from "./commands/create.js";
import { verseCommand } from "./commands/verse.js";
import { templatesCommand } from "./commands/templates.js";
import { validateCommand } from "./commands/validate.js";
import { prefabsCommand } from "./commands/prefabs.js";
import { doctorCommand } from "./commands/doctor.js";
import { resumeCommand } from "./commands/resume.js";
import { initCommand } from "./commands/init.js";

const program = new Command();

program
  .name("uefn-ai")
  .description("ForgeAI — AI-powered UEFN world generator")
  .version("0.2.0-beta");

program.addCommand(createCommand);
program.addCommand(verseCommand);
program.addCommand(templatesCommand);
program.addCommand(validateCommand);
program.addCommand(prefabsCommand);
program.addCommand(doctorCommand);
program.addCommand(resumeCommand);
program.addCommand(initCommand);

program.parse();
