<!--lint disable awesome-git-repo-age-->

# Awesome Artificial Intelligence [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> A curated collection of resources for artificial intelligence, agent engineering, models, memory, evaluation, and research.

Part of [akashic](../../README.md), the Ego Hygiene knowledge collection.

## Contents

- [Agent Skills and Standards](#agent-skills-and-standards)
- [Agents and Developer Tools](#agents-and-developer-tools)
- [Evaluation and Safety](#evaluation-and-safety)
- [Frameworks and Organizations](#frameworks-and-organizations)
- [Learning and Prompt Engineering](#learning-and-prompt-engineering)
- [Memory and Context](#memory-and-context)
- [Models and Providers](#models-and-providers)
- [Research](#research)


## Agent Skills and Standards

- [ADK Agent Skills](https://adk.dev/skills/) - Official Agent Development Kit guide to discovering, loading, authoring, and using Agent Skills.
- [Agent Skill Index](https://www.agent-skill.co/) - Searchable index of Agent Skills, tutorials, examples, and compatible agent platforms.
- [Agent Skills Reference Library](https://github.com/agentskills/agentskills/tree/main/skills-ref) - Reference library and validation tooling for reading, parsing, and checking Agent Skills packages.
- [Agent Skills Repository](https://github.com/agentskills/agentskills) - Source repository for the Agent Skills specification, documentation, examples, and reference tooling.
- [Agent Skills Specification](https://agentskills.io/specification) - Open specification for portable skill directories built around SKILL.md metadata, instructions, scripts, references, and assets.
- [Awesome Agent Skills by Heilcheng](https://github.com/heilcheng/awesome-agent-skills) - Curated directory of Agent Skills tutorials, authoring guides, registries, and collections.
- [Awesome Agent Skills by VoltAgent](https://github.com/VoltAgent/awesome-agent-skills) - Large cross-agent collection of skills from official development teams and the broader community.
- [Awesome Claude Skills](https://github.com/ComposioHQ/awesome-claude-skills) - Curated collection of reusable Claude skills, plugins, integrations, templates, and agent-workflow resources.
- [Awesome GitHub Copilot Custom Agents](https://awesome-copilot.github.com/agents/) - Catalog of reusable custom agents for GitHub Copilot, organized by domain and development workflow.
- [Awesome Skills](https://awesome-skills.com/) - Searchable catalog of skills and plugins for Claude Code and other compatible coding agents.
- [Building ADK Agents with Skills](https://developers.googleblog.com/developers-guide-to-building-adk-agents-with-skills/) - Google developer guide to packaging reusable instructions and resources as skills for Agent Development Kit agents.
- [Gangsta Agents](https://gangsta.page/) - Cross-platform skill framework for spec-driven agent development with explicit roles, phase gates, approvals, budgets, and persistent memory.
- [Garden Skills](https://github.com/ConardLi/garden-skills) - Open collection of skills for web design, knowledge retrieval, image generation, and other agent workflows.
- [GitHub CLI Skill Publish](https://cli.github.com/manual/gh_skill_publish) - GitHub CLI command for validating Agent Skills and publishing them through versioned GitHub releases.
- [Official Skills Directory](https://officialskills.sh/) - Directory focused on Agent Skills published by official product, framework, and platform teams.
- [Skill Registry](https://github.com/andrewhowdencom/skr) - CLI and GitHub Action for validating, building, installing, and publishing Agent Skills through Git or OCI registries.
- [Skills.sh](https://www.skills.sh/) - Agent Skills directory and command-line installer for discovering and adding reusable skills from public repositories.
- [Vercel Skills CLI](https://github.com/vercel-labs/skills) - Open command-line tool for installing and managing Agent Skills across supported coding agents.

## Agents and Developer Tools

- [Agenta](https://agenta.ai/) - Open-source LLM operations workspace for prompt management, evaluation, observability, human feedback, and production iteration.
- [Agentic](https://github.com/Cluster444/agentic) - Workflow tool for OpenCode that supplies structured context engineering, planning, memory, and project commands.
- [AI Coding Agents Configuration](https://github.com/jjmartres/ai-coding-agents) - Shared source of truth for skills, commands, rules, and configuration across OpenCode and Pi coding agents.
- [Awesome GitHub Copilot](https://awesome-copilot.github.com/) - Official community catalog of Copilot instructions, prompts, agents, skills, hooks, and reusable development configurations.
- [Awesome GPTs](https://awesomegpt.vip/) - Community-curated directory of custom GPTs and open prompt collections across academic, writing, education, programming, image, and general tasks.
- [Awesome Harness Engineering](https://github.com/ai-boost/awesome-harness-engineering) - Curated collection of agent-harness tools and resources spanning memory, permissions, MCP, evaluation, observability, and orchestration.
- [Awesome OpenCode](https://github.com/awesome-opencode/awesome-opencode) - Curated collection of OpenCode plugins, themes, agents, projects, tooling, and learning resources.
- [Bolt.new](https://bolt.new/) - Account-based browser workspace for prompting, editing, previewing, and deploying full-stack web applications; model usage, hosting, and advanced features depend on the service plan.
- [BrowserAct](https://www.browseract.com/) - Commercial agent-assisted service that builds reusable browser automations and web-data extractors from natural-language requests; account, target-site terms, and usage limits apply.
- [CLI-Anything Hub](https://clianything.cc/) - Registry and installer for agent-friendly command-line interfaces that expose applications, services, and creative tools to automation.
- [CodeNomad](https://github.com/NeuralNomadsAI/CodeNomad) - Open-source web and desktop command center for managing OpenCode workspaces, sessions, sidecars, terminals, and remote access.
- [Cynative Deep Research Agent](https://www.helpnetsecurity.com/2026/07/13/cynative-open-source-deep-research-agent/) - Overview of Cynative's open-source autonomous research agent for multi-source investigation, synthesis, and cited reporting.
- [Deep Agents Frontend with CopilotKit](https://dev.to/copilotkit/how-to-build-a-frontend-for-langchain-deep-agents-with-copilotkit-52kd) - Tutorial for pairing a LangChain Deep Agent backend with a CopilotKit-based interactive frontend.
- [exe.dev](https://exe.dev/) - API-first service providing durable, private, shareable virtual-machine sandboxes for developers and software agents.
- [Fractal](https://github.com/plasma-ai/fractal) - Hierarchical agent-loop runtime that uses bounded recursive worktrees, local state, budgets, and operator controls for separable tasks.
- [Gangsta Framework Source](https://github.com/kucherenko/gangsta) - Source repository for the Gangsta spec-driven agent-skills framework, including roles, phase gates, persistent memory, and installation tooling.
- [GitHub Spec Kit](https://github.github.com/spec-kit/index.html) - Extensible, agent-agnostic harness for spec-driven development through structured specification, planning, task, and implementation phases.
- [Herdr](https://herdr.dev/) - Runtime platform for deploying, isolating, observing, and scaling coding agents across repositories and development environments.
- [Kiro Autonomous Agent](https://kiro.dev/blog/introducing-kiro-autonomous-agent/) - Introduction to Kiro's remotely running coding agent, including steering, pull-request workflows, and GitHub issue assignment.
- [LangChain Deep Agents](https://docs.langchain.com/oss/python/deepagents/overview) - Batteries-included agent harness with planning, file-system context, subagents, long-term memory, and human-in-the-loop capabilities.
- [Loop Engineering Toolkit](https://github.com/cobusgreyling/loop-engineering) - Practical patterns, starter assets, checklists, and CLI tools for designing and auditing iterative AI coding-agent loops.
- [Meridian OS](https://github.com/codejunkie99/meridian-company-os) - Open-source operational control plane for coordinating company goals, ownership, approvals, budgets, and work across humans and AI agents.
- [Oh My OpenAgent](https://omo.dev/) - Agent harness for complex codebases with an orchestration-rich OpenCode edition and portable Codex CLI components.
- [Oh My OpenCode DeepWiki](https://deepwiki.com/code-yeongyu/oh-my-opencode) - Generated architectural documentation and codebase guide for the project now known as Oh My OpenAgent.
- [Ollama OpenCode Integration](https://docs.ollama.com/integrations/opencode) - Official guide to configuring OpenCode to run against local or remote models served by Ollama.
- [Open SWE](https://www.langchain.com/blog/open-swe-an-open-source-framework-for-internal-coding-agents) - Overview of LangChain's open-source framework for repository-aware internal coding agents triggered from team workflows.
- [OpenAgentsControl](https://github.com/darrenhinde/OpenAgentsControl) - Plan-first AI-agent framework with approval gates, testing, review, validation, and multi-language workflow support for OpenCode.
- [OpenChamber Documentation](https://docs.openchamber.dev/) - Documentation for installing, configuring, customizing, remotely accessing, and steering OpenCode through OpenChamber.
- [OpenChamber Themes](https://docs.openchamber.dev/themes/) - Guide to installing and authoring custom JSON themes for the OpenChamber agent workspace.
- [OpenChamber](https://github.com/openchamber/openchamber) - Open-source desktop and web workspace for running, supervising, reviewing, and remotely steering OpenCode agent sessions.
- [OpenCode Agents](https://opencode.ai/docs/agents/) - Official reference for defining primary agents and subagents, model settings, tools, permissions, prompts, modes, and colors.
- [OpenCode Cafe](https://www.opencode.cafe/) - Community marketplace for discovering and sharing OpenCode plugins, themes, commands, tools, hooks, and extensions.
- [OpenCode Ecosystem](https://opencode.ai/docs/ecosystem/) - Official directory of community projects, plugins, applications, providers, and integrations built around OpenCode.
- [OpenCode Obsidian](https://www.opencode.cafe/plugin/opencode-obsidian) - OpenCode plugin that embeds the coding assistant in Obsidian for vault-centered writing, research, and knowledge work.
- [OpenCode Plugins](https://opencode.ai/docs/plugins) - Official guide to installing and developing OpenCode plugins with hooks, tools, dependencies, and lifecycle events.
- [OpenCode Rules](https://opencode.ai/docs/rules/) - Official guide to supplying project and global instructions through AGENTS.md files and reusable rule references.
- [OpenCode WakaTime](https://www.opencode.cafe/plugin/opencode-wakatime) - OpenCode plugin that records coding-agent usage and activity through WakaTime.
- [OpenSession](https://www.opencode.cafe/plugin/opensession) - OpenCode Cafe listing for an extension focused on preserving and working with OpenCode sessions.
- [OpenSandbox](https://open-sandbox.ai/) - Open-source sandbox infrastructure for isolating code execution, browser automation, and agent workloads across local or scalable deployments.
- [OpenSpec](https://openspec.dev/) - Lightweight, open-source framework for keeping agent-generated proposals, designs, tasks, and specification deltas beside the code.
- [OpenWork](https://github.com/different-ai/openwork) - Open-source desktop workspace for agentic work, powered by OpenCode and designed as an alternative to proprietary cowork tools.
- [Optimizing GitHub Copilot Cost](https://techcommunity.microsoft.com/blog/azuredevcommunityblog/optimizing-github-copilot-cost-in-the-usage-based-billing-era/4534186) - Microsoft guidance for measuring, governing, and reducing GitHub Copilot consumption under usage-based billing.
- [Pi Agent Toolkit](https://github.com/earendil-works/pi) - Toolkit providing a unified LLM API, agent loop, terminal UI, coding-agent CLI, and extensible packages.
- [Spec Kit Community Presets](https://github.github.com/spec-kit/community/presets.html) - Catalog of community presets that customize Spec Kit templates, commands, terminology, governance, and delivery workflows.
- [Understand Anything](https://understand-anything.com/) - Codebase exploration tool that generates interactive knowledge graphs for tracing architecture, symbols, and relationships; repository access and generated explanations should be reviewed before relying on them.
- [yutu](https://yutu.ifor.dev/) - Open-source YouTube automation toolkit combining a CLI, MCP server, skills, and multi-agent workflows for channel operations.

## Evaluation and Safety

- [DeepTeam](https://www.helpnetsecurity.com/2025/11/26/deepteam-open-source-llm-red-teaming-framework/) - Overview of an open-source framework for red-teaming LLM applications against prompt injection and other adversarial behaviors.
- [Langfuse](https://langfuse.com/) - Open-source LLM engineering platform for traces, prompt management, evaluation, datasets, metrics, and collaborative debugging.
- [Promptfoo](https://www.promptfoo.dev/) - Open-source toolkit for testing prompts and model outputs, comparing providers, automating evaluations, and red-teaming AI applications.
- [Qualifire](https://qualifire.ai/) - LLM reliability control plane combining evaluations, observability, policy enforcement, guardrails, prompt management, and data curation.

## Frameworks and Organizations

- [AI SDK](https://ai-sdk.dev/) - Open-source, framework-agnostic TypeScript toolkit for multi-provider AI applications, agents, streaming, tools, and generative interfaces.
- [Answer.AI](https://www.answer.ai/) - Practical AI research-and-development lab publishing open-source tools, education, policy analysis, and end-user research applications.
- [AutoGluon](https://github.com/autogluon/autogluon) - AutoML toolkit for training and deploying accurate models across tabular, multimodal, and time-series data.
- [BentoML](https://bentoml.com/) - Open-source framework and commercial platform for packaging, serving, optimizing, and scaling machine-learning and generative-AI inference workloads.
- [Chunkr](https://github.com/lumina-ai-inc/chunkr) - Open-source document-intelligence service for layout analysis, OCR, and semantic chunking into RAG- and LLM-ready data.
- [DeepPavlov](https://github.com/deeppavlov/DeepPavlov) - Open-source framework and model collection for conversational AI, natural-language processing, and deployable assistants.
- [DeepTutor Source](https://github.com/HKUDS/DeepTutor) - Source repository for DeepTutor's lifelong personalized tutoring platform, agent runtime, memory, RAG, and learning tools.
- [DocArray](https://github.com/docarray/docarray) - Library for representing, sending, storing, and searching multimodal data in machine-learning and generative-AI applications.
- [DocsGPT Cloud](https://app.docsgpt.cloud/) - Hosted DocsGPT workspace for chatting with documents and building source-grounded assistants over uploaded knowledge.
- [FLAML](https://github.com/microsoft/FLAML) - Lightweight library for automated machine learning and efficient LLM workflow optimization.
- [HumanSignal](https://github.com/HumanSignal) - Open-source organization behind Label Studio and related data-labeling integrations, SDKs, and examples.
- [IBM](https://www.ibm.com/) - Global technology portal connecting IBM products, documentation, research, open-source work, learning, support, and developments in AI, quantum computing, and hybrid cloud.
- [Imagen PyTorch](https://github.com/lucidrains/imagen-pytorch) - PyTorch implementation of Google's text-to-image Imagen architecture for research and experimentation.
- [imaginAIry](https://github.com/brycedrennan/imaginAIry) - Python toolkit for image generation, editing, captioning, and enhancement with open models.
- [IOPaint](https://www.iopaint.com/) - Open-source image inpainting and editing application with object removal, replacement, outpainting, and model plugins.
- [Jina AI](https://github.com/jina-ai) - Open-source organization building neural-search, multimodal data, embedding, reranking, and agent infrastructure.
- [Label Studio](https://labelstud.io/) - Open-source data-labeling platform for preparing training data across text, images, audio, video, and time series.
- [LangChain](https://github.com/langchain-ai/langchain) - Agent-engineering framework and ecosystem for building applications powered by language models.
- [LaTeX-OCR](https://github.com/lukas-blecher/LaTeX-OCR) - Image-to-markup model and command-line tooling that converts images of mathematical formulas into LaTeX.
- [Lightning AI](https://github.com/Lightning-AI) - Open-source organization behind PyTorch Lightning and tools for training, deploying, and operating AI systems.
- [LLaMA Cookbook](https://github.com/meta-llama/llama-cookbook) - Official examples, recipes, and reference implementations for building, fine-tuning, evaluating, and deploying applications with Meta LLaMA models.
- [LLaMA Model Access](https://llama.meta.com/llama-downloads/) - Official access and download portal for Meta's LLaMA model weights and license terms.
- [Mem0](https://github.com/mem0ai/mem0) - Memory layer for AI applications and agents that extracts, stores, and retrieves useful conversational context.
- [Meta LLaMA](https://github.com/meta-llama) - Official organization for Meta's LLaMA models, recipes, tools, and reference implementations.
- [MLflow](https://github.com/mlflow) - Open-source platform and project organization for managing machine-learning and generative-AI lifecycles.
- [NASA Intelligent Systems Division](https://www.nasa.gov/intelligent-systems-division/) - Research division developing autonomous systems, machine learning, planning, and human-centered intelligent technologies for NASA missions.
- [NeMo Guardrails](https://github.com/NVIDIA/NeMo-Guardrails) - Toolkit for adding programmable safety, security, and topical guardrails to LLM applications.
- [OpenAI Evals](https://github.com/openai/evals) - Framework and registry for evaluating language models and model-powered systems.
- [OpenProse](https://prose.md/) - Declarative language and runtime for defining durable AI-agent work as versioned Markdown contracts.
- [PaddleNLP](https://github.com/PaddlePaddle/PaddleNLP) - Natural-language-processing and large-model library built on PaddlePaddle with training, inference, and deployment tooling.
- [Rasa](https://github.com/RasaHQ) - Open-source organization developing conversational AI and agent infrastructure.
- [Replicate Cog](https://github.com/replicate/cog) - Tool for packaging machine-learning models in reproducible containers with a predictable API.
- [Replicate](https://github.com/replicate) - Open-source organization for Cog, model packaging, inference tooling, examples, and related machine-learning infrastructure.

## Learning and Prompt Engineering

- [Anthropic Prompt Engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview) - Official guidance for defining success criteria, building evaluations, and improving prompts for Claude with current best practices and tutorials.
- [Google Prompt Design Strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies) - Official Gemini guide to clear instructions, examples, context, constraints, response formats, decomposition, and iterative prompt design.
- [Learn Prompting](https://learnprompting.org/docs/introduction) - Free, structured curriculum covering generative-AI fundamentals, prompt engineering, reliability, security, agents, and applied techniques.
- [OpenAI Cookbook](https://cookbook.openai.com/) - Official collection of practical examples, guides, and reusable patterns for building with OpenAI models and APIs.
- [Prompt Engineering Guide](https://www.promptingguide.ai/) - Broad open guide to prompting techniques, agents, retrieval, model-specific practices, risks, research papers, tools, and datasets.

## Memory and Context

- [Context Layer and Company Brain](https://towardsdatascience.com/how-to-build-a-context-layer-and-a-company-brain/) - Architecture article on turning fragmented organizational knowledge into a governed context layer that agents can retrieve and use.
- [Context7](https://github.com/upstash/context7) - Platform and MCP server supplying version-aware, up-to-date library documentation to LLMs and coding agents.
- [EgonexAI](https://egonexai.com/) - Commercial knowledge and identity platform for building structured understanding layers across people, content, and agents; review privacy, access, and model-processing terms before connecting sensitive sources.
- [Elastic Atlas Agent Memory](https://www.infoq.com/news/2026/06/elastic-atlas-agent-memory/) - Report on Elastic's Atlas approach to layered memory for durable, evolving agent context and retrieval.
- [Google Cloud Knowledge Catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog) - Tools and samples for building, validating, serving, and consuming agent-oriented knowledge catalogs and OKF packages.
- [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) - Karpathy's compact, evolving technical wiki of language-model concepts, terminology, scaling, training, inference, and agent systems.
- [Memora](https://github.com/microsoft/Memora) - Agent-memory framework using harmonic representations to balance high-fidelity details with structured abstractions and retrieval cues.
- [Open Knowledge Format Explained](https://www.mariehaynes.com/okf/) - Accessible overview of Google's Open Knowledge Format and its role in structuring agent-readable knowledge.
- [Open Knowledge Format Specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) - Specification for packaging structured, versioned, inspectable knowledge that agents can discover and consume progressively.
- [OpenCode Mem](https://www.opencode.cafe/plugin/opencode-mem) - Local vector-database plugin that gives OpenCode persistent memories across sessions and projects.
- [OpenCode Supermemory](https://github.com/supermemoryai/opencode-supermemory) - OpenCode plugin that injects persistent user, project, and semantically retrieved memories into coding sessions.
- [OpenViking](https://github.com/volcengine/OpenViking) - Self-evolving context database unifying agent memory, knowledge retrieval, skills, and progressively disclosed file-system resources.
- [PipesHub](https://pipeshub.com/) - Open-source workplace-search and agent platform for connecting organizational applications, indexing governed knowledge, and serving retrieval and automation workflows.
- [ReasoningBank](https://www.marktechpost.com/2025/10/01/google-ai-proposes-reasoningbank-a-strategy-level-i-agent-memory-framework-that-makes-llm-agents-self-evolve-at-test-time/) - Summary of an agent-memory approach that converts successful and failed trajectories into reusable reasoning strategies.
- [Supermemory](https://supermemory.ai/) - Context infrastructure for agents with persistent memory, retrieval, profiles, connectors, extractors, and model-independent APIs.

## Models and Providers

- [Microsoft Mage](https://github.com/microsoft/Mage) - Official source for Microsoft's lightweight 4B-parameter Mage family for visual understanding, generation, and multimodal research.
- [Microsoft Mage Flow](https://microsoft.github.io/Mage/flow/) - Interactive research page for Mage-Flow, Microsoft's compact text-to-image generation and instruction-based editing model.
- [Models.dev](https://models.dev/) - Open-source database comparing AI models, providers, context windows, capabilities, pricing, and release metadata.
- [OpenRouter](https://openrouter.ai/) - Unified API and routing platform for accessing models across many inference providers with shared billing and compatibility layers.

## Research

- [A2UI Agent-to-User Interface](https://www.marktechpost.com/2025/12/22/google-introduces-a2ui-agent-to-user-interface-an-open-sourc-protocol-for-agent-driven-interfaces/) - Overview of Google's declarative protocol for streaming agent-generated interfaces through trusted native component catalogs.
- [Agent Harness Engineering](https://www.oreilly.com/radar/agent-harness-engineering/) - Essay defining the prompts, tools, state, orchestration, constraints, infrastructure, and observability that turn models into agents.
- [An Image Is Worth 16×16 Words](https://arxiv.org/abs/2010.11929) - Paper introducing the Vision Transformer approach of applying a pure Transformer to sequences of image patches.
- [AngelSpec](https://www.marktechpost.com/2026/07/30/tencent-open-sources-angelspec-a-unified-training-framework-for-mtp-and-block-parallel-speculative-decoding-on-hy3-models/) - Overview of Tencent's unified training framework for multi-token prediction and block-parallel speculative decoding on Hunyuan models.
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) - Foundational paper introducing the Transformer architecture based entirely on attention mechanisms.
- [Circuit Sparsity](https://www.marktechpost.com/2025/12/13/openai-has-released-the-circuit-sparsity-a-set-of-open-tools-for-connecting-weight-sparse-models-and-dense-baselines-through-activation-bridges/) - Overview of OpenAI tools connecting interpretable weight-sparse transformer circuits with comparable dense model baselines.
- [Continuous AI in Practice](https://github.blog/ai-and-ml/generative-ai/continuous-ai-in-practice-what-developers-can-automate-today-with-agentic-ci/) - GitHub guide to event-driven agentic CI for maintenance, review, triage, documentation, and repository automation.
- [Enhanced Reverberation as Supervision](https://arxiv.org/abs/2408.03438) - Paper introducing an enhanced unsupervised training method for monaural speech separation from multichannel mixtures.
- [Image-to-Markup Generation with Coarse-to-Fine Attention](https://arxiv.org/abs/1609.04938) - Research on neural conversion of rendered mathematical expressions into LaTeX and other presentational markup.
- [LLM Wiki Tutorial](https://datasciencedojo.com/blog/llm-wiki-tutorial/) - Tutorial on building an LLM-powered wiki for knowledge ingestion, retrieval, question answering, and source-grounded exploration.
- [MedASR](https://www.marktechpost.com/2025/12/23/google-health-ai-releases-medasr-a-conformer-based-medical-speech-to-text-model-for-clinical-dictation/) - Overview of Google's open-weight Conformer speech-recognition model for English clinical dictation and medical conversations.
- [OpenHarness-Style Agent Runtime](https://www.marktechpost.com/2026/06/24/how-to-design-an-openharness-style-agent-runtime-with-tools-memory-permissions-skills-and-multi-agent-coordination/) - Architecture guide to agent runtimes combining tools, memory, permissions, skills, observability, and multi-agent coordination.
- [Seventeen Agentic AI Patterns](https://levelup.gitconnected.com/building-17-agentic-ai-patterns-and-their-role-in-large-scale-ai-systems-f4915b5615ce) - Survey of agent architectures including multi-agent, ensemble, tree-of-thought, reflexive, ReAct, and control patterns.
- [The Art of Loop Engineering](https://www.langchain.com/blog/the-art-of-loop-engineering) - Framework for progressing agent loops from basic tool use through verification, event-driven execution, and durable operation.
- [Tool Selection in AI Agents](https://machinelearningmastery.com/the-complete-guide-to-tool-selection-in-ai-agents/) - Guide to designing tool catalogs, routing strategies, retrieval, evaluation, and failure handling for tool-using agents.

Suggestions and improvements are welcome. See the [contribution guidelines](../../contributing.md).

[← Return to the complete collection](../../README.md)
