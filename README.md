<!--lint disable awesome-git-repo-age-->
<!-- Remove the rule override above after the repository is at least 30 days old. -->

# Awesome [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> A curated tree of awesome lists for tools, resources, knowledge, inspiration, and the open web.

This repository is the root index for the Ego Hygiene awesome collection. Categories emerge from real resources, and larger branches can graduate into focused lists as the collection grows.

## Contents

- [Artificial Intelligence](#artificial-intelligence)
  - [Frameworks and Organizations](#frameworks-and-organizations)
  - [Research](#research)
- [Containers and Cloud](#containers-and-cloud)
  - [Docker](#docker)
  - [Examples and Deployment](#examples-and-deployment)
  - [Package Management and Reproducibility](#package-management-and-reproducibility)
  - [Platforms and Storage](#platforms-and-storage)
  - [Runtimes and Specifications](#runtimes-and-specifications)
- [Developer Tools](#developer-tools)
  - [Application Development](#application-development)
  - [Data and Databases](#data-and-databases)
  - [Documentation and Publishing](#documentation-and-publishing)
  - [Package Management](#package-management)
  - [Shell, Terminal, and Environments](#shell-terminal-and-environments)
  - [Web Capture and Community Features](#web-capture-and-community-features)
- [Open Source](#open-source)
  - [Collections](#collections)
  - [Community and Governance](#community-and-governance)
  - [Foundations and Standards](#foundations-and-standards)
  - [History and Perspectives](#history-and-perspectives)
  - [Licensing and Compliance](#licensing-and-compliance)
  - [Programs and Support](#programs-and-support)
- [Security](#security)
  - [Organizations, Tools, and Learning](#organizations-tools-and-learning)
  - [Supply Chain and Software Assurance](#supply-chain-and-software-assurance)
  - [Vulnerability Data](#vulnerability-data)
- [TeX and Typesetting](#tex-and-typesetting)
  - [Accessibility and Web](#accessibility-and-web)
  - [Authoring and Editing](#authoring-and-editing)
  - [Build, Conversion, and Automation](#build-conversion-and-automation)
  - [Distributions and Package Management](#distributions-and-package-management)
  - [Drawing and Visualization](#drawing-and-visualization)
  - [Examples and Templates](#examples-and-templates)
  - [Learning and Reference](#learning-and-reference)
  - [Packages and Language](#packages-and-language)
- [Scientific Research](#scientific-research)
  - [Data and Literature](#data-and-literature)
  - [Organizations and Open Science](#organizations-and-open-science)
  - [Scientific Computing](#scientific-computing)
  - [Scholarly Publishing](#scholarly-publishing)
- [Work and Learning](#work-and-learning)
  - [Communities and Events](#communities-and-events)
  - [Learning and Careers](#learning-and-careers)
  - [Workspace](#workspace)
- [Meta](#meta)

## Artificial Intelligence

### Frameworks and Organizations

- [AutoGluon](https://github.com/autogluon/autogluon) - AutoML toolkit for training and deploying accurate models across tabular, multimodal, and time-series data.
- [FLAML](https://github.com/microsoft/FLAML) - Lightweight library for automated machine learning and efficient LLM workflow optimization.
- [imaginAIry](https://github.com/brycedrennan/imaginAIry) - Python toolkit for image generation, editing, captioning, and enhancement with open models.
- [LangChain](https://github.com/langchain-ai/langchain) - Agent-engineering framework and ecosystem for building applications powered by language models.
- [Lightning AI](https://github.com/Lightning-AI) - Open-source organization behind PyTorch Lightning and tools for training, deploying, and operating AI systems.
- [Meta LLaMA](https://github.com/meta-llama) - Official organization for Meta's LLaMA models, recipes, tools, and reference implementations.
- [NASA Intelligent Systems Division](https://www.nasa.gov/intelligent-systems-division/) - Research division developing autonomous systems, machine learning, planning, and human-centered intelligent technologies for NASA missions.
- [OpenAI Evals](https://github.com/openai/evals) - Framework and registry for evaluating language models and model-powered systems.
- [OpenProse](https://prose.md/) - Declarative language and runtime for defining durable AI-agent work as versioned Markdown contracts.
- [Rasa](https://github.com/RasaHQ) - Open-source organization developing conversational AI and agent infrastructure.

### Research

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) - Foundational paper introducing the Transformer architecture based entirely on attention mechanisms.
- [Image-to-Markup Generation with Coarse-to-Fine Attention](https://arxiv.org/abs/1609.04938) - Research on neural conversion of rendered mathematical expressions into LaTeX and other presentational markup.

## Containers and Cloud

### Docker

- [Additional Build Contexts](https://docs.docker.com/reference/cli/docker/buildx/build/#build-context) - Docker Buildx reference for supplying named local, Git, HTTP, image, and OCI-layout contexts to a build.
- [Build Cache](https://docs.docker.com/build/cache/) - Docker guide to cache storage, reuse, invalidation, exporters, and optimization.
- [Build Cache Invalidation](https://docs.docker.com/build/cache/invalidation/) - Reference for how Docker determines cache matches and how to force cache invalidation safely.
- [Build Checks](https://docs.docker.com/build/checks/#fail-build-on-check-violations) - Guide to validating Dockerfiles and failing builds when selected build checks report violations.
- [Build Variables](https://docs.docker.com/build/building/variables/) - Docker documentation for build arguments, environment variables, and predefined build variables.
- [Building Best Practices](https://docs.docker.com/build/building/best-practices/) - Official guidance for efficient, maintainable, and secure image builds, including when to use `ADD` or `COPY`.
- [Building Go Images](https://docs.docker.com/language/golang/build-images/) - Docker guide to containerizing Go applications with multi-stage builds and minimal runtime images.
- [Building with Bake from a Compose File](https://docs.docker.com/build/bake/compose-file/) - Guide to translating Compose services into Buildx Bake targets and extending them with `x-bake`.
- [BuildKit](https://github.com/moby/buildkit) - Concurrent, cache-efficient build toolkit that powers modern Docker image construction.
- [CMD and ENTRYPOINT](https://docs.docker.com/reference/dockerfile/#understand-how-cmd-and-entrypoint-interact) - Dockerfile reference explaining how `CMD` and `ENTRYPOINT` interact.
- [Compose Build Specification](https://docs.docker.com/reference/compose-file/build/) - Compose reference for configuring service image builds, contexts, arguments, targets, and cache behavior.
- [Compose Development Specification](https://docs.docker.com/reference/compose-file/develop/) - Compose reference for development-time synchronization and rebuild behavior.
- [Compose Environment Interpolation](https://docs.docker.com/reference/compose-file/interpolation/) - Rules for variable interpolation and escaping within Compose configuration files.
- [Compose Environment Variable Sources](https://docs.docker.com/compose/environment-variables/set-environment-variables/) - Guide to setting container environment variables through Compose configuration and environment files.
- [Compose Environment Variables](https://docs.docker.com/compose/environment-variables/envvars/) - Reference for environment variables that configure Docker Compose behavior.
- [Compose with Multiple Files](https://docs.docker.com/compose/multiple-compose-files/) - Guide to merging, extending, and layering multiple Compose files for different environments.
- [Configure Locales in Debian and Ubuntu](https://www.tobanet.de/s/2022/11/locales-in-debian-and-ubuntu/) - Practical instructions for generating and selecting locales in Debian-derived systems and images.
- [Debian Docker Wiki](https://wiki.debian.org/Docker) - Debian-specific installation, configuration, and troubleshooting notes for Docker.
- [Docker ADD Instruction](https://docs.docker.com/reference/dockerfile/#add) - Dockerfile reference for adding local or remote files, archives, and Git repositories to an image.
- [Docker and Dockerfile Snippets](https://brojonat.com/posts/snippets_docker/) - Practical notes and reusable examples for Docker commands and Dockerfiles.
- [Docker Best Practices by Francisco Segredo](https://medium.com/@fsegredo2000/docker-best-practices-6fa3de5f17cb) - Community article covering image construction, layering, security, and maintainability practices.
- [Docker Build Cloud Optimization](https://docs.docker.com/build-cloud/optimization/) - Guidance for improving Docker Build Cloud transfer and build performance.
- [Docker Build Output Exporters](https://docs.docker.com/build/building/export/) - Guide to exporting BuildKit results as images, filesystems, archives, or other output types.
- [Docker CLI Environment Variables](https://docs.docker.com/reference/cli/docker/#environment-variables) - Reference for environment variables that configure Docker CLI behavior, contexts, TLS, and content trust.
- [Docker CLI Reference](https://docs.docker.com/reference/cli/docker/) - Official command reference for the Docker command-line interface.
- [Docker Compose Time Zones](https://confluence.atlassian.com/kb/how-to-set-the-timezone-for-docker-container-976780914.html) - Atlassian knowledge-base guide to configuring time zones for Docker containers.
- [Docker Container Time Zones](https://gist.github.com/sjimenez44/1b73afeae3eec26a1915b0d4d5873b8f) - Community examples for configuring time zones with Docker Engine, Dockerfiles, Compose, volumes, and Kubernetes.
- [Docker GitHub Actions](https://docs.docker.com/build/ci/github-actions/) - Official patterns for building, testing, signing, and publishing images with GitHub Actions.
- [Docker Run Pseudo-TTY](https://docs.docker.com/reference/cli/docker/container/run/#tty) - Official reference for allocating a pseudo-terminal with `docker container run`.
- [Docker Run Sysctls](https://docs.docker.com/reference/cli/docker/container/run/#sysctl) - Reference for setting namespaced kernel parameters when running containers.
- [Dockerfile Best Practices by Hexops](https://github.com/hexops-graveyard/dockerfile) - Archived guide to writing production-oriented Dockerfiles and minimizing image complexity.
- [Dockerfile Reference](https://docs.docker.com/reference/dockerfile/) - Canonical reference for Dockerfile syntax, instructions, parser directives, and build checks.
- [Forcing Docker to Use `linux/amd64` on macOS](https://stackoverflow.com/questions/65612411/forcing-docker-to-use-linux-amd64-platform-by-default-on-macos) - Community solutions for controlling the default image platform on Apple Silicon.
- [Installing or Changing Locales on Debian](https://serverfault.com/questions/54591/how-to-install-change-locale-on-debian) - Long-running community reference for installing locale data and setting Debian's default locale.
- [Installing Specific APT Versions in Docker](https://www.reddit.com/r/docker/comments/kvhc3m/best_practices_for_install_specific_version_from/) - Community discussion of version pinning, repository snapshots, and reproducibility tradeoffs in Debian-based images.
- [Managing Buildx Builders](https://docs.docker.com/build/builders/manage/) - Guide to creating, inspecting, selecting, and removing Docker Buildx builders.
- [Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/) - Guide to separating build and runtime stages to produce smaller, cleaner images.
- [Setting the Time Zone in a Docker Container](https://stackoverflow.com/questions/57607381/how-do-i-change-timezone-in-a-docker-container) - Community approaches for setting `TZ`, installing `tzdata`, or mounting host time-zone files.
- [Using Bake for Multi-Platform Compose Builds](https://stackoverflow.com/questions/65807281/how-to-use-docker-buildx-bake-to-build-docker-compose-containers-for-both-linux) - Community example of combining Buildx Bake, Compose, and multi-platform image targets.

### Examples and Deployment

- [Akuity Guestbook](https://github.com/akuity/guestbook) - GitOps guestbook example used to demonstrate Argo CD and declarative Kubernetes delivery.
- [Docker Compose Samples](https://docs.docker.com/compose/samples-for-compose/) - Official collection of sample applications and service stacks for Docker Compose.
- [Docker Official Images](https://github.com/docker-library) - Source, metadata, and automation repositories behind Docker Official Images.
- [Docker Setup Buildx Action](https://github.com/docker/setup-buildx-action) - Official GitHub Action for creating and configuring a Docker Buildx builder in CI.
- [Google Cloud Click to Deploy](https://github.com/GoogleCloudPlatform/click-to-deploy) - Source for deployable application solutions published through Google Cloud Marketplace.
- [IBM Guestbook Example](https://github.com/IBM/guestbook) - Archived multi-tier Kubernetes and Docker sample with a web frontend and replicated Redis services.
- [MinIO Container Image](https://hub.docker.com/r/minio/minio) - Official container image for running the MinIO S3-compatible object store.
- [Quay Clair Compose Example](https://github.com/quay/clair/blob/main/docker-compose.yaml) - Reference Compose stack for running the Clair container-vulnerability scanner and its dependencies.

### Package Management and Reproducibility

- [APT Package Trust](https://www.debian.org/doc/manuals/aptitude/ch02s05s05.en.html) - Debian Aptitude documentation explaining authenticated repositories, package signatures, and trust decisions.
- [APT Utils](https://www.mankier.com/package/apt-utils) - Man pages for Debian package-management utilities such as `apt-ftparchive` and `apt-sortpkgs`.
- [Apt-Cacher NG](https://www.unix-ag.uni-kl.de/~bloch/acng/html/index.html) - Documentation for a caching proxy specialized for software package downloads.
- [Build Path Prefix Map Specification](https://reproducible-builds.org/specs/build-path-prefix-map/) - Specification for communicating build-path remapping to compilers and build tools.
- [Recording Version Information](https://reproducible-builds.org/docs/version-information/) - Guidance for preserving useful version metadata without making otherwise identical builds differ.
- [repro-sources-list.sh](https://github.com/reproducible-containers/repro-sources-list.sh) - Configures APT and related package sources to use reproducible snapshots.
- [Reproducible Builds Publications](https://reproducible-builds.org/docs/publications/) - Bibliography of academic and technical publications about reproducible software builds.
- [Reproducible Builds Standard Environment Variables](https://wiki.debian.org/ReproducibleBuilds/StandardEnvironmentVariables#Checklist) - Checklist of environment variables considered when standardizing reproducible build environments.
- [Reproducible Builds Website](https://salsa.debian.org/reproducible-builds/reproducible-website) - Source repository for the Reproducible Builds project website and its guidance on deterministic software artifacts.

### Platforms and Storage

- [AlmaLinux](https://almalinux.org/) - Community-owned, enterprise-focused Linux distribution compatible with the Red Hat Enterprise Linux ecosystem.
- [MinIO](https://min.io/) - S3-compatible object store for private clouds, Kubernetes, and local infrastructure.
- [OpenStack](https://www.openstack.org/) - Open-source infrastructure platform for managing compute, storage, and networking resources.

### Runtimes and Specifications

- [binfmt_misc](https://en.wikipedia.org/wiki/Binfmt_misc) - Overview of the Linux kernel facility for registering interpreters for arbitrary executable formats.
- [BuildKit Multi-Platform Images](https://github.com/moby/buildkit#building-multi-platform-images) - BuildKit documentation for cross-compilation and multi-platform image construction.
- [Bytecode Alliance](https://bytecodealliance.org/) - Nonprofit open-source organization building secure WebAssembly runtimes, components, and standards.
- [Compose Specification Schema](https://github.com/compose-spec/compose-spec/blob/main/schema/compose-spec.json) - Canonical JSON Schema for validating Compose application models.
- [containerd](https://containerd.io/) - Industry-standard container runtime focused on simplicity, robustness, and portability.
- [gosu](https://github.com/tianon/gosu) - Minimal privilege-dropping utility commonly used by container entrypoints to run processes as another user.
- [Kata Containers](https://katacontainers.io/) - Secure container runtime that combines lightweight virtual machines with a container workflow.
- [OCI Image Annotations](https://specs.opencontainers.org/image-spec/annotations/) - Open Container Initiative keys and conventions for attaching metadata to images, manifests, and indexes.
- [OCI Image Configuration](https://github.com/opencontainers/image-spec/blob/main/config.md) - Open Container Initiative specification for image configuration, runtime execution parameters, and filesystem changes.
- [OCI Runtime Implementations](https://github.com/opencontainers/runtime-spec/blob/main/implementations.md) - Catalog of implementations of the Open Container Initiative runtime specification.
- [OpenContainers](https://github.com/opencontainers) - GitHub organization for the Open Container Initiative specifications, tooling, and reference implementations.
- [regclient](https://github.com/regclient/regclient) - Command-line tools and Go libraries for inspecting, copying, and modifying OCI images and registries.
- [tonistiigi/binfmt](https://github.com/tonistiigi/binfmt) - Cross-platform emulator collection distributed as Docker images for BuildKit and other container workflows.

## Developer Tools

### Application Development

- [Backstage](https://backstage.io/) - Open platform for building developer portals around service catalogs, documentation, templates, and plugins.
- [CMake Make Program Troubleshooting](https://stackoverflow.com/questions/6141608/cmake-make-program-not-found) - Community troubleshooting reference for missing build generators and compiler toolchains in CMake.
- [FastAPI](https://github.com/fastapi) - Open-source organization maintaining FastAPI and adjacent Python web-development projects.
- [Guestbook App](https://github.com/Ikram-Maulana/guest-book) - Example guestbook built with Next.js, NextAuth, tRPC, Redis, Tailwind CSS, and the T3 stack.
- [librsvg](https://gitlab.gnome.org/GNOME/librsvg) - GNOME library and command-line tooling for rendering SVG content with Cairo.
- [Matrix Synapse](https://github.com/matrix-org/synapse) - Matrix homeserver implementation for decentralized, federated real-time communication.
- [next-sitemap](https://github.com/iamvishnusankar/next-sitemap) - Sitemap and robots.txt generator for Next.js applications.
- [nilcons](https://github.com/nilcons/) - Open-source organization for presentation, editor, language, and developer-tool experiments.
- [Pyodide](https://github.com/pyodide) - Python distribution for browsers and Node.js built on WebAssembly.
- [Qt for Open Source Development](https://www.qt.io/development/download-open-source) - Qt downloads and guidance for choosing and complying with its open-source licenses.
- [r-lib](https://github.com/r-lib) - R-focused organization maintaining reusable packages for development, testing, command-line interfaces, and package infrastructure.
- [r-lib Actions](https://github.com/r-lib/actions) - Reusable GitHub Actions for testing, documenting, checking, and releasing R packages.
- [Reflex](https://github.com/reflex-dev/reflex) - Python framework for building full-stack web applications with reactive user interfaces.
- [spdlog](https://github.com/gabime/spdlog) - Fast, header-only or compiled C++ logging library with asynchronous logging and multiple sink types.
- [Suno CLI](https://github.com/paperfoot/suno-cli) - Rust command-line client for interacting with Suno workspaces and downloading generated music assets.
- [vcpkg ARM64 Linux Bootstrap Failure](https://github.com/microsoft/vcpkg/issues/39663) - Closed troubleshooting issue showing missing compiler and Ninja prerequisites while bootstrapping vcpkg on ARM64 Linux.
- [Zope Component Architecture Guide](https://github.com/baijum/zcadoc) - Book-length guide to component-based Python development with the Zope Component Architecture.

### Data and Databases

- [Airbyte](https://github.com/airbytehq/airbyte) - Extensible data-integration platform for moving data between APIs, databases, warehouses, and lakes.
- [Databricks Community](https://community.databricks.com/) - Community forum for Databricks data engineering, analytics, machine learning, and platform questions.
- [Elasticsearch](https://github.com/elastic) - Open-source organization behind Elasticsearch and related search, observability, and data tooling.
- [ODMantic](https://github.com/art049/odmantic) - Asynchronous MongoDB object-document mapper built around Python type hints and Pydantic models.
- [pysqlite3](https://github.com/coleifer/pysqlite3) - Separately packaged fork of Python's SQLite bindings with support for linking newer SQLite releases.
- [s3cmd](https://s3tools.org/s3cmd) - Command-line client for Amazon S3 and compatible object-storage services.
- [SQLModel](https://github.com/fastapi/sqlmodel) - Python library combining SQLAlchemy and Pydantic models for typed database applications.

### Documentation and Publishing

- [CommonMark](https://commonmark.org/) - Strongly defined, highly compatible specification and test suite for Markdown.
- [Open Journals](https://github.com/openjournals) - Open-source organization maintaining publishing infrastructure for the Journal of Open Source Software and related journals.
- [Pandoc Installation](https://pandoc.org/installing.html) - Official installation options for the Pandoc document converter across operating systems and package managers.
- [Pandoc Manual](https://pandoc.org/MANUAL.html) - Complete reference for Pandoc input formats, output formats, extensions, templates, filters, and command options.

### Package Management

- [MacPorts](https://github.com/macports) - Source and package definitions for the MacPorts package manager on macOS.
- [Managing Software with Zypper and RPM](https://documentation.suse.com/sles/12-SP5/html/SLES-all/cha-sw-cl.html) - SUSE guide to installing, updating, verifying, and building packages with Zypper and RPM.
- [MELPA](https://melpa.org/) - Large community package archive for Emacs.
- [Ubuntu Locale Definition](https://manpages.ubuntu.com/manpages/oracular/en/man5/locale.5.html) - Manual page describing the files and fields used to define locale categories on Linux.
- [Ubuntu Locale Setup](https://help.ubuntu.com/community/Locale) - Ubuntu community guide to generating, selecting, and troubleshooting locales.
- [Ubuntu Locale Utility](https://manpages.ubuntu.com/manpages/oracular/en/man1/locale.1posix.html) - POSIX manual page for reporting locale settings and available locale definitions.

### Shell, Terminal, and Environments

- [Antoine Gagné Dotfiles](https://github.com/AntoineGagne/dot-files) - Personal shell, editor, and workstation configuration collection.
- [bpkg](https://github.com/bpkg/bpkg) - Lightweight Bash package manager for installing shell scripts globally or as project dependencies.
- [chiro Dotfiles](https://github.com/chiro/dotfiles) - Personal Unix configuration files and bootstrap scripts.
- [fzf](https://github.com/junegunn/fzf) - General-purpose command-line fuzzy finder with shell, editor, and process-selection integrations.
- [Installing Build Essentials on macOS](https://stackoverflow.com/questions/38086451/how-to-install-build-essential-on-mac) - Community explanation of the macOS equivalents to Debian's `build-essential` package.
- [Linux Capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html) - Authoritative Linux manual page for the fine-grained privileges assigned to processes and files.
- [MrPandey01 Dotfiles](https://github.com/MrPandey01/dotfiles) - Personal Linux desktop, shell, and application configuration files.
- [Red Hat Linux System Information Commands](https://www.redhat.com/sysadmin/linux-system-info-commands) - Practical guide to commands for inspecting Linux hardware, kernels, storage, memory, and networking.
- [Shellharden](https://github.com/anordal/shellharden) - Corrective shell syntax highlighter that can rewrite scripts toward ShellCheck conformance.
- [sysinfo](https://pkg.go.dev/github.com/zcalusic/sysinfo) - Go library for collecting Linux host, hardware, operating-system, network, storage, and container information.
- [Warp](https://www.warp.dev/) - Terminal-based agentic development environment with modern command editing and workflow features.
- [YuH25JP Dotfiles](https://github.com/YuH25JP/dotfiles) - Personal development-environment and Unix configuration repository.

### Web Capture and Community Features

- [GitHub Profile README Guestbook](https://gist.github.com/traumverloren/a7fa4c89c27fc3adedf1ff96b0514472) - Tutorial for building a nostalgic profile guestbook using a public GitHub Gist.
- [PyWebCopy](https://github.com/rajatomar788/pywebcopy) - Python package for saving web pages locally with their images, stylesheets, scripts, and links.
- [Site Cloner](https://github.com/codeperfectplus/Site-Cloner) - Python utility for cloning a website's reachable pages and static assets for local use.
- [wener Notes, Stories, and Awesomes](https://github.com/wenerme/wener) - Large multilingual knowledge repository spanning infrastructure, development, operations, and curated references.

## Open Source

### Collections

- [Awesome Open Source Systems](https://github.com/ishanvyas22/awesome-open-source-systems) - Curated collection of free and open-source systems grouped by practical use case.
- [Awesome SDN](https://github.com/sdnds-tw/awesome-sdn) - Curated collection of software-defined networking controllers, tools, research, and learning resources.
- [Open Source Is Awesome Wiki](https://wiki.opensourceisawesome.com/) - Community-maintained wiki collecting open-source software, self-hosting, and infrastructure guidance.

### Community and Governance

- [All In](https://github.com/AllInOpenSource) - Historical organization and project collection focused on advancing diversity, equity, and inclusion in open source.
- [Badging by CHAOSS](https://badging.chaoss.community/) - Peer-review badging program for recognizing inclusive open-source projects and events.
- [Cauldron](https://github.com/cauldronio/cauldron) - Open-source SaaS analytics platform built on GrimoireLab for studying software-development and community activity.
- [CHAOSS](https://chaoss.community/about-chaoss/) - Linux Foundation project developing metrics, models, and software for understanding open-source community health.
- [CHAOSS Badging on GitHub](https://github.com/badging) - Repositories and automation supporting CHAOSS diversity, equity, and inclusion badging.
- [Creative Commons Community Team](https://opensource.creativecommons.org/community/community-team/) - Participation hub for contributors supporting Creative Commons open-source projects and community operations.
- [EightKnot](https://eightknot.osci.io/) - Open-source analytics platform for exploring contributor activity and community health across repositories.
- [Linux Foundation Guide to Participating in Open Source Communities](https://www.linuxfoundation.org/resources/open-source-guides/participating-in-open-source-communities) - Practical guide to contribution norms, communication, collaboration, and sustainable participation.
- [Open Source Community Self-Selection](https://opensauced.pizza/blog/open-source-community-self-selection) - OpenSauced essay about how community signals and contribution pathways shape who participates.
- [Open Source Initiative Community](https://opensource.org/community) - Community participation, working groups, affiliates, and events around the Open Source Initiative.
- [Open Source Project Management](https://www.zenhub.com/guides/open-source-project-management) - Guide to planning, contributor coordination, roadmaps, and sustainable workflows in open-source projects.
- [OSS Compass](https://oss-compass.org/) - Open-source community health platform offering metrics, dashboards, and evaluation models for software ecosystems.
- [TODO Group](https://todogroup.org/) - Community of Open Source Program Office practitioners sharing governance knowledge and resources.

### Foundations and Standards

- [Cloud Native Computing Foundation](https://www.cncf.io/) - Vendor-neutral foundation supporting Kubernetes and the broader cloud-native open-source ecosystem.
- [Drupal Association](https://www.drupal.org/association) - Nonprofit organization supporting Drupal's infrastructure, community, events, and long-term sustainability.
- [FINOS](https://www.finos.org/) - Linux Foundation organization advancing open-source collaboration and standards in financial services.
- [Free Qt Foundation](https://kde.org/community/whatiskde/kdefreeqtfoundation/) - Independent body protecting the continued availability of Qt under free-software licenses.
- [Free Software Foundation](https://www.fsf.org/about/) - Nonprofit organization advocating for computer-user freedom and free software.
- [GNOME Foundation](https://foundation.gnome.org/) - Nonprofit organization supporting the GNOME desktop, contributors, infrastructure, and community.
- [KDE](https://kde.org/) - International free-software community developing the Plasma desktop and a broad application ecosystem.
- [LF Energy Foundation Repository](https://github.com/lf-energy/foundation) - Governance, charter, and operational materials for the LF Energy open-source community.
- [OASIS Open](https://www.oasis-open.org/) - Nonprofit consortium developing open standards through community collaboration.
- [Open Source Automation Development Lab](https://www.osadl.org/) - Industry cooperative supporting open-source software for automation, real-time Linux, and embedded systems.
- [Open Source Geospatial Foundation](https://www.osgeo.org/content/foundation/about.html) - Nonprofit foundation supporting open-source geospatial software, education, and community collaboration.
- [OpenForum Europe](https://openforumeurope.org/expertise/) - European nonprofit providing research and policy expertise on open source, standards, interoperability, and digital sovereignty.
- [Software in the Public Interest](https://www.spi-inc.org/) - Nonprofit fiscal sponsor that handles administrative work for open-source software and hardware projects.

### History and Perspectives

- [A Brief History of Free and Open Source Software](https://www.computer.org/csdl/magazine/co/2021/02/09353517/1r8kwgBjU9W) - IEEE Computer article tracing the development, institutions, licensing, and culture of free and open-source software.
- [How Red Hat Helped Make Open Source a Global Phenomenon](https://www.inc.com/greg-satell/how-red-hat-scaled-from-an-unlikely-startup-to-a-major-global-enterprise.html) - Case study of Red Hat's growth and influence on commercial open source.
- [Open Source Community Overview](https://www.sciencedirect.com/topics/computer-science/open-source-community) - Reference overview of open-source communities and the concepts used to study them.
- [Open Source Development Labs](https://en.wikipedia.org/wiki/Open_Source_Development_Labs) - Historical overview of the nonprofit consortium that later merged with the Free Standards Group to form the Linux Foundation.
- [Open Source Development Labs Directory Archive](https://www.techonline.com/directory/open-source-development-labs-osdl/) - Historical directory page for the organization that merged into the Linux Foundation.
- [Open Source Has a Funding Problem](https://stackoverflow.blog/2021/01/07/open-source-has-a-funding-problem/) - Essay examining the maintenance and sustainability challenges created by underfunded open-source infrastructure.
- [The Future of Open Source: SaaS, the Final Frontier](https://sentry.io/resources/the-future-of-open-source-saas-the-final-frontier/) - Sentry's perspective on sustainable open-source software and SaaS business models.
- [The Product Approach to Open Source Communities](https://stackoverflow.blog/2023/11/08/the-product-approach-to-open-source-communities/) - Essay on applying product thinking to the design and growth of open-source communities.

### Licensing and Compliance

- [SPDX License List Data](https://github.com/spdx/license-list-data) - Machine-readable SPDX License List data in JSON, RDFa, text, HTML, and other formats.
- [SPDX Package Information](https://spdx.github.io/spdx-spec/v2.3/package-information/) - SPDX 2.3 specification fields for describing software packages and their provenance, licensing, and checksums.

### Programs and Support

- [Canonical Open Source](https://github.com/canonical) - Official repositories for Ubuntu, Juju, LXD, Snapcraft, MAAS, and other Canonical projects.
- [Discord Open Source](https://github.com/discord/discord-open-source) - Collection of open-source libraries and infrastructure components published by Discord.
- [Docker-Sponsored Open Source Program](https://www.docker.com/community/open-source/application/) - Benefits and application details for eligible non-commercial open-source projects using Docker.
- [Drupal](https://www.drupal.org/) - Community site for the open-source Drupal content-management platform, modules, documentation, and contributors.
- [Goldman Sachs Open Source](https://developer.gs.com/discover/open-source) - Catalog of Goldman Sachs open-source projects and its approach to contributing software publicly.
- [Hexops Graveyard](https://github.com/hexops-graveyard) - Archived organization preserving discontinued Hexops projects and engineering experiments.
- [Linux Foundation Open Source Guides](https://www.linuxfoundation.org/resources/open-source-guides) - Collection of guides for maintainers, enterprises, contributors, and open-source program offices.
- [Microsoft Open Source Program](https://opensource.microsoft.com/program/) - Overview of Microsoft's internal open-source governance, tooling, and program office.
- [Open Source at Rapid7](https://www.rapid7.com/open-source/) - Catalog of security projects, libraries, and research released by Rapid7.
- [Open Source Days](https://events.linuxfoundation.org/open-source-days/) - Linux Foundation event series bringing open-source communities together for technical sessions and collaboration.
- [Open Source Institute](https://ossinstitute.org/) - Nonprofit focused on open-source education, adoption, and community programs.
- [Open Source Software Lab at Oregon State University](https://osuosl.org/) - Hosting, infrastructure, and services for major open-source communities and projects.
- [Palisadoes Foundation](https://www.palisadoes.org/) - Nonprofit using open-source software projects and mentorship to expand STEM opportunities for underserved communities.
- [Recurse Center](https://www.recurse.com/) - Self-directed, community-based programming retreat with a free and open educational environment.

## Security

### Organizations, Tools, and Learning

- [Argus](https://github.com/jasonxtn/Argus) - Python toolkit combining reconnaissance and information-gathering modules for security assessments.
- [Cloud Security Alliance](https://github.com/CloudSecurityAlliance) - Open-source repositories for cloud-security research, controls, tools, and community projects.
- [Falco](https://www.sysdig.com/opensource/falco) - Cloud-native runtime security tool for detecting unexpected behavior in hosts and containers.
- [Installing the Social-Engineer Toolkit on Ubuntu](https://askubuntu.com/questions/394141/how-to-install-social-engineering-toolkit) - Historical community Q&A about installing the penetration-testing toolkit on Ubuntu.
- [Metasploit](https://www.metasploit.com/) - Official project and product site for the Metasploit penetration-testing ecosystem.
- [Metasploit Framework](https://github.com/rapid7/metasploit-framework) - Open-source penetration-testing framework and exploit-development platform.
- [OpenVPN Community](https://openvpn.net/community/) - Community edition, source, documentation, and participation resources for OpenVPN.
- [OWASP Dependency-Check Container Image](https://hub.docker.com/r/owasp/dependency-check) - Official container image for scanning application dependencies for publicly disclosed vulnerabilities.
- [Privacy-Enhanced Mail](https://en.wikipedia.org/wiki/Privacy-Enhanced_Mail) - Historical overview of the PEM standards for encrypted and authenticated email.
- [Social-Engineer Toolkit](https://github.com/trustedsec/social-engineer-toolkit) - TrustedSec framework for authorized social-engineering assessments and security awareness testing.
- [Social-Engineer Toolkit Guide](https://www.stationx.net/social-engineer-toolkit/) - Educational overview of the Social-Engineer Toolkit, its modules, and safe lab-oriented usage.
- [TrustedSec](https://github.com/trustedsec) - Open-source security tools and research from the TrustedSec team.

### Supply Chain and Software Assurance

- [AboutCode ScanCode Toolkit](https://github.com/aboutcode-org/scancode-toolkit) - Software-composition analysis toolkit for detecting licenses, copyrights, packages, and dependencies in codebases.
- [Best Practices Badge](https://github.com/coreinfrastructure/best-practices-badge) - Source for the OpenSSF Best Practices program used to assess and badge open-source projects.
- [BuildKit SLSA Provenance](https://github.com/moby/buildkit/blob/master/docs/attestations/slsa-provenance.md) - BuildKit documentation for generating SLSA provenance attestations during image builds.
- [BuildKit Syft Scanner](https://github.com/docker/buildkit-syft-scanner) - BuildKit scanner plugin using Syft to generate software bills of materials.
- [Datadog Static Analysis Rules](https://docs.datadoghq.com/code_analysis/static_analysis_rules/) - Catalog of Datadog rules for identifying security, correctness, performance, and maintainability issues.
- [Docker Scout](https://www.docker.com/products/docker-scout/) - Docker service for image analysis, vulnerability context, policy evaluation, and supply-chain insights.
- [Docker Scout GitHub Action](https://github.com/marketplace/actions/docker-scout) - GitHub Action for analyzing container images and enforcing Docker Scout policies in CI.
- [Docker Scout SBOM Release Notes](https://www.docker.com/blog/highlights-buildkit-v0-11-release/#2-software-bill-of-materials) - BuildKit release overview covering software bills of materials and provenance attestations.
- [OWASP Dependency-Track](https://owasp.org/www-project-dependency-track/) - Software-composition analysis platform for continuously tracking components, vulnerabilities, and policy risk.
- [SLSA Provenance Definitions](https://docs.docker.com/build/metadata/attestations/slsa-definitions/) - Docker reference mapping BuildKit provenance fields to SLSA concepts and build metadata.
- [Snyk on Malicious Packages and Supply-Chain Attacks](https://snyk.io/blog/preventing-malicious-packages-and-supply-chain-attacks-with-snyk/) - Guide to detecting and reducing malicious-package and dependency supply-chain risk.

### Vulnerability Data

- [Bitnami Vulnerability Database](https://github.com/bitnami/vulndb) - Vulnerability metadata collected for Bitnami applications and container images.
- [FriendsOfPHP Security Advisories](https://github.com/FriendsOfPHP/security-advisories) - Community database of known security vulnerabilities affecting PHP packages.
- [GitHub Advisory Database for npm](https://github.com/advisories?query=type%3Areviewed+ecosystem%3Anpm) - Live view of reviewed security advisories affecting packages in the npm ecosystem.
- [Global Security Database](https://gsd.id/) - Community-led vulnerability database and identifier system with openly available data.
- [OSS-Fuzz Vulnerabilities](https://github.com/google/oss-fuzz-vulns) - Machine-readable vulnerability records discovered through Google's OSS-Fuzz service.
- [R Consortium Advisory Database](https://github.com/RConsortium/r-advisory-database) - Security advisories for packages published through CRAN and Bioconductor.
- [RubySec](https://github.com/rubysec) - Community-maintained Ruby security advisories and tooling, including the Ruby Advisory Database.
- [RustSec](https://github.com/rustsec) - Rust security organization maintaining the advisory database, auditing tools, and related projects.

## TeX and Typesetting

### Accessibility and Web

- [accessibility](https://ctan.org/pkg/accessibility) - LaTeX package providing experimental support for tagged and structurally accessible PDF output.
- [ASTER](https://emacspeak.sourceforge.net/raman/aster/aster-toplevel.html) - Historical audio typesetting system for rendering structured scientific and mathematical documents as speech.
- [axessibility](https://github.com/integr-abile/axessibility) - LaTeX package that exposes mathematical formulae to screen readers and braille displays.
- [embedfile](https://ctan.org/pkg/embedfile) - LaTeX package for embedding arbitrary source or data files directly into PDF output.
- [glossaries-accsupp](https://ctan.org/pkg/glossaries-accsupp) - Accessibility extension that improves copied and assistive text for glossary entries and symbols.
- [How to Make Accessible PDF](https://www.latex-project.org/news/2024/07/08/tagging/) - LaTeX Project update and entry point for current tagged-PDF guidance, examples, and compatibility tracking.
- [LaTeX Access](https://svn.code.sf.net/p/latex-access/code/) - Legacy accessibility tools for translating LaTeX mathematical content into speech and braille-oriented representations.
- [MathJax](https://github.com/mathjax/MathJax) - Accessible JavaScript display engine for mathematics in web browsers.
- [tagpdf](https://github.com/latex3/tagpdf) - LaTeX support code for producing tagged and accessible PDF documents.

### Authoring and Editing

- [BaKoMa TeX](https://www.bakoma-tex.com/) - Legacy commercial TeX system known for visual, source-synchronized document editing.
- [BibDesk](https://bibdesk.sourceforge.io/) - macOS bibliography manager for editing BibTeX databases, organizing papers, and integrating with TeX workflows.
- [bibsort](https://ctan.math.illinois.edu/biblio/bibtex/utils/bibsort/bibsort.txt) - Legacy utility for sorting and normalizing BibTeX database entries.
- [BibView-X](https://ctan.org/pkg/bibview-x) - Legacy X Window graphical editor for creating, searching, and moving entries between BibTeX databases.
- [JaxEdit](https://zohooo.github.io/jaxedit/) - Browser-based LaTeX editor with live preview, sharing, and presentation support.
- [Laeqed](https://www.thrysoee.dk/laeqed/) - Legacy cross-platform LaTeX equation editor that stores editable source inside generated PNG images.
- [LaTeXiT](https://www.chachatelier.fr/latexit/latexit-downloads.php?lang=en) - macOS utility for typesetting LaTeX equations and exporting them into other applications.
- [LTeX](https://marketplace.visualstudio.com/items?itemName=valentjn.vscode-ltex) - LanguageTool-powered grammar and spell checker for LaTeX, Markdown, and related formats in Visual Studio Code.
- [nics](https://nics.nilcons.com/) - Code-first presentation system that produces browser-based slides and printable PDF output.
- [Overleaf](https://www.overleaf.com/) - Collaborative browser-based LaTeX editor, successor to ShareLaTeX, with real-time editing and project templates.
- [Papis](https://github.com/papis/papis) - Command-line bibliography and document manager with scriptable storage and metadata workflows.
- [RefDB](https://refdb.sourceforge.net/) - Legacy reference and bibliography database with support for multiple output formats.
- [TeXShop](https://github.com/TeXShop/TeXShop) - Native macOS TeX editor and PDF previewer distributed with MacTeX.
- [TeXstudio](https://www.texstudio.org/) - Cross-platform LaTeX editor with integrated completion, build tools, viewers, and diagnostics.
- [TikZiT](https://github.com/tikzit/tikzit) - Graphical editor for creating and maintaining TikZ diagrams based on nodes, edges, and reusable styles.

### Build, Conversion, and Automation

- [arara](https://gitlab.com/islandoftex/arara/) - TeX automation tool that executes build directives embedded in document comments.
- [AUCTeX Latexmk](https://github.com/tom-tan/auctex-latexmk) - AUCTeX integration for compiling and continuously previewing documents with Latexmk.
- [BlackTeX](https://github.com/texworld/blacktex) - Opinionated formatter for normalizing LaTeX source files.
- [CaTeX](https://github.com/Alexis-benoist/CaTeX) - Legacy Python utility that concatenates LaTeX documents while merging their preambles.
- [ChkTeX](https://git.savannah.nongnu.org/cgit/chktex.git) - Source repository for the semantic LaTeX linter that detects typographic and syntax mistakes.
- [Compile LaTeX GitHub Action](https://github.com/marketplace/actions/compile-latex) - Marketplace action for compiling TeX and LaTeX documents in GitHub workflows.
- [DANTE LaTeX Action](https://github.com/dante-ev/latex-action) - Community-maintained fork of `xu-cheng/latex-action` for compiling LaTeX documents in GitHub Actions.
- [Deepin Latexmk Packaging](https://github.com/deepin-community/latexmk) - Distribution packaging repository for Latexmk in the Deepin Linux ecosystem.
- [LaTeX Dev Container](https://github.com/a-nau/latex-devcontainer) - Containerized VS Code development environment for reproducible LaTeX authoring and compilation.
- [LaTeX Makefile](https://code.google.com/archive/p/latex-makefile/) - Archived Makefile-based automation project for compiling and cleaning LaTeX documents.
- [LaTeX2HTML](https://github.com/latex2html/latex2html) - Source repository for the legacy Perl converter that translates LaTeX documents into HTML.
- [Latexmake.py](https://github.com/JanKanis/latexmk.py) - Legacy Python build tool that automates LaTeX command sequences and can watch source files for changes.
- [Latexmk](https://www.cantab.net/users/johncollins/latexmk/index.html) - Build tool that reruns LaTeX and auxiliary programs until references and generated outputs are current.
- [Latexmk Configuration Examples](https://gist.github.com/Mearman/d62eb04db69e8c610326507d0c9ad31f) - Versioned `.latexmkrc` examples for bibliographies, glossaries, viewers, generated files, and custom build steps.
- [Pandoc Action Example](https://github.com/pandoc/pandoc-action-example) - Reference repository for converting documents with Pandoc in GitHub Actions.
- [pdftex-quiet](https://gitlab.com/jirislav/pdftex-quiet) - Bash wrapper that filters pdfTeX output to emphasize relevant errors.
- [plasTeX](https://github.com/plastex) - Python framework that parses LaTeX documents and renders them through configurable output templates.
- [Tectonic](https://github.com/tectonic-typesetting/tectonic) - Modern, self-contained TeX and LaTeX engine powered by XeTeX and TeX Live.
- [Texi2HTML](https://www.nongnu.org/texi2html/) - Legacy converter for transforming Texinfo documents into HTML.
- [TrY](https://ctan.org/pkg/try) - Linux script that automates TeX and LaTeX compilation using commands embedded in document comments.
- [Using Latexmk](https://mg.readthedocs.io/latexmk.html) - Practical tutorial for installing, running, watching, cleaning, and configuring Latexmk.
- [xu-cheng/latex-action](https://github.com/xu-cheng/latex-action) - GitHub Action for compiling LaTeX documents with configurable engines, working directories, and build arguments.

### Distributions and Package Management

- [CTAN](https://www.ctan.org/) - Comprehensive TeX Archive Network for packages, documentation, source, and TeX ecosystem resources.
- [Island of TeX](https://gitlab.com/islandoftex) - TeX-focused GitLab community maintaining container images, packaging infrastructure, and related tooling.
- [MacTeX](https://tug.org/mactex/) - TeX Live distribution and macOS application bundle maintained by the TeX Users Group.
- [MiKTeX](https://miktex.org/) - Cross-platform TeX distribution with on-demand package installation and an integrated package manager.
- [TeX Live Utility](https://github.com/amaxwell/tlutility) - Native macOS interface for updating and configuring TeX Live installations.

### Drawing and Visualization

- [Asymptote](https://www.ctan.org/pkg/asymptote) - Vector-graphics language for precise technical diagrams with native mathematical typesetting.
- [Awesome LaTeX Drawing](https://github.com/xinychen/awesome-latex-drawing) - Curated examples for drawing models, tensors, technical systems, and scientific illustrations in LaTeX.
- [Fredokun TikZ Editor](https://github.com/fredokun/TikZ-Editor) - Experimental graphical interface for editing TikZ drawings and previewing generated output.
- [PetarV-/TikZ](https://github.com/PetarV-/TikZ) - Collection of reusable PGF and TikZ figures for machine learning, mathematics, and computer science.
- [TeXample.net](https://texample.net/) - Searchable gallery of LaTeX and TikZ examples organized by topic, feature, library, and package.
- [TeXnique](https://texnique.xyz/) - Timed and untimed game for practicing LaTeX mathematics by recreating rendered formulas.
- [TikzEdt](https://github.com/hchapman/tikzedt) - Legacy WYSIWYM editor for creating TikZ diagrams with live preview and code assistance.
- [tikzplotlib](https://github.com/nschloe/tikzplotlib) - Python tool that exports Matplotlib figures as PGFPlots and TikZ for native LaTeX integration.

### Examples and Templates

- [Beamer Presentation Example](https://github.com/sevagh/beamer-presentation) - Complete LaTeX Beamer presentation project with theme, figures, references, and build automation.
- [Dialogue Conference LaTeX Template](https://github.com/nlpub/dialogue-latex) - Archived LaTeX template and Pandoc workflow for submissions to the Dialogue conference.
- [Dickimaw Books Gallery](https://www.dickimaw-books.com/gallery/) - Gallery of LaTeX examples, diagrams, documents, and package demonstrations from Nicola Talbot.
- [Homework Template](https://github.com/nikosavola/HomeworkTemplateLatex) - Reusable LaTeX template for homework assignments and mathematical coursework.
- [LaTeX Beamer Theme Overview](https://github.com/UweZiegenhagen/LaTeX-Beamer-Theme-Overview/blob/main/OVERVIEW.md) - Visual catalog of standard and community Beamer themes with rendered previews.
- [LaTeX Cookbook](https://github.com/alexpovel/latex-cookbook) - Collection of practical LaTeX recipes, patterns, and complete working examples.
- [LaTeX Templates Forum](https://latex.org/forum/viewforum.php?f=57) - LaTeX.org community forum for finding, discussing, and troubleshooting document templates.
- [Martin Thoma's LaTeX Examples](https://github.com/MartinThoma/LaTeX-examples) - Broad collection of working examples demonstrating LaTeX features, packages, and document patterns.
- [PhD Thesis by RemDelaporteMathurin](https://github.com/RemDelaporteMathurin/PhDthesis) - Complete LaTeX source and assets for a scientific doctoral thesis.
- [PracTeX Journal LaTeX Class](https://www.tug.org/pracjourn/styles/latex/) - Source, documentation, and sample files for the journal's LaTeX class.
- [PracTeX Journal Style Files](https://www.tug.org/pracjourn/stylefiles.html) - Download index for document classes, bibliography styles, examples, and supporting files used by The PracTeX Journal.
- [Prosper](https://prosper.sourceforge.net/) - Legacy LaTeX class for creating slide presentations with PostScript and PDF output.
- [Science Fiction and Fantasy Manuscript Class](https://www.ctan.org/pkg/sffms) - Document class for formatting science-fiction and fantasy manuscripts for publishers.
- [ScribUTT](https://github.com/ungdev/ScribUTT) - French LaTeX template for project, coursework, and internship reports at the University of Technology of Troyes.
- [Sized Dependent Types Thesis Source](https://github.com/ionathanch/msc-thesis) - Complete LaTeX and Agda source for a master's thesis, including its class, bibliography, figures, and build configuration.
- [Ultimate Beamer Theme List](https://github.com/martinbjeldbak/ultimate-beamer-theme-list) - Curated catalog of Beamer themes with screenshots and source links.
- [VCLanNguyen Thesis](https://github.com/VCLanNguyen/Thesis) - Complete public thesis source repository useful as a real-world LaTeX project example.

### Learning and Reference

- [Comprehensive LaTeX Symbol List Data](https://mirror.math.princeton.edu/pub/CTAN/info/symbols/comprehensive/SYMLIST) - Plain-text mapping of user-facing commands from the Comprehensive LaTeX Symbol List.
- [Developing Training Materials on GitHub](https://uk-tug-archive.tug.org/2011/07/11/developing-training-materials-on-github/) - UK-TUG article about collaboratively maintaining a beginner LaTeX course with GitHub.
- [Getting Started with TeX, LaTeX, and Friends](https://www.tug.org/begin.html) - TeX Users Group guide to choosing a TeX system, editor, learning path, and community resources.
- [LaTeX Documentation](https://www.latex-project.org/help/documentation/) - Official LaTeX Project index of manuals, books, guides, and documentation.
- [LaTeX Documentation Survey](https://ctan.org/pkg/docsurvey) - Survey and index of documentation resources for learning and using TeX and LaTeX.
- [LaTeX Font Catalogue](https://tug.org/FontCatalogue/) - Visual catalog of fonts available for use with TeX and LaTeX.
- [LaTeX for Industrial Sciences](https://sciences-indus-cpge.papanicola.info/-LaTeX-en-SI-) - French-language resources for using LaTeX in engineering and industrial-science coursework.
- [LaTeX Guide by Keith J. Topping](https://www.cs.stir.ac.uk/~kjt/software/latex/latex.html) - Long-form introduction to LaTeX documents, mathematics, tables, figures, and customization.
- [LaTeX.net](https://latex.net/) - Community hub publishing LaTeX news, tutorials, books, examples, and package articles.
- [Learn LaTeX](https://www.learnlatex.org/) - Interactive, multilingual introduction to LaTeX with lessons and runnable examples.
- [Micro-Typographic Extensions to the TeX Typesetting System](https://www.tug.org/TUGboat/tb21-4/tb69thanh.pdf) - Hàn Thế Thành's foundational work on margin kerning and font expansion in pdfTeX.
- [Nicola Talbot on LaTeX.net](https://latex.net/author/nicola/) - Articles and resources from the author of several LaTeX books and packages.
- [TeX Development Blog](https://www.texdev.net/) - Articles on LaTeX development, packages, engines, standards, and release changes.
- [TeX Users Group Author Index](https://tug.org/TUGboat/Contents/listauthor.html) - Author index for articles published in TUGboat.
- [TeXdoc Online](https://texdoc.org/) - Web interface for finding and opening documentation shipped with TeX distributions.
- [TeXfragen](https://texfragen.de/) - German-language LaTeX knowledge base, FAQ, and community resource.
- [The LaTeX Companion, Second Edition Errata](https://www.latex-project.org/help/books/tlc2-err.pdf) - Official corrections and updates for the second edition of The LaTeX Companion.
- [The Visual LaTeX FAQ](https://ctan.math.illinois.edu/info/visualfaq/visualFAQ.pdf) - Illustrated problem-to-solution index for common LaTeX formatting questions.
- [Using LaTeX to Create PDF Documents](https://www.math.uakron.edu/~dpstory/latx2pdf.html) - Historical guide to building interactive and web-oriented PDF documents with LaTeX.
- [What Is LaTeX?](https://scottmcpeak.com/latex/whatislatex.html) - Concise conceptual introduction to LaTeX, its workflow, and the kinds of documents it suits.
- [What Is LaTeX? by Peter Walden](https://tug.org/pracjourn/2005-3/walden-whatis/) - PracTeX Journal introduction to LaTeX concepts, workflow, and document structure.

### Packages and Language

- [attachfile2 Source](https://github.com/ho-tex/attachfile2) - Source and issue tracker for the package that attaches files to PDF documents.
- [jbig2dec](https://github.com/ArtifexSoftware/jbig2dec) - Decoder library and command-line tool for JBIG2-compressed images commonly embedded in PDFs.
- [l2x](https://ctan.org/pkg/l2x) - Legacy general-purpose LaTeX converter implemented with a C parser and Tcl callbacks.
- [LaTeX3](https://www.latex-project.org/latex3/) - LaTeX Project work on the LaTeX3 programming layer and the evolution of the format.
- [microtype](https://ctan.org/pkg/microtype) - Configurable character protrusion, font expansion, kerning, tracking, and other microtypographic refinements.
- [minted](https://github.com/gpoore/minted) - LaTeX package and source for syntax-highlighted code listings powered by Pygments.
- [nomencl](https://github.com/borisveytsman/nomencl) - LaTeX package for generating and formatting nomenclatures with MakeIndex.
- [pgfornament](https://ctan.org/pkg/pgfornament) - PGF and TikZ package for drawing reusable vector ornaments in TeX documents.
- [PygmenTeX](https://www.ctan.org/pkg/pygmentex) - Python and LaTeX tooling for inserting Pygments-highlighted code into TeX documents.
- [xparse](https://mirrors.mit.edu/CTAN/macros/latex/contrib/l3packages/xparse.pdf) - Documentation for defining flexible LaTeX command and environment interfaces with the LaTeX3 argument parser.
- [xsavebox](https://gitlab.com/agrahn/xsavebox) - Package for reusing typeset content through PDF Form XObjects without duplicating output code.

## Scientific Research

### Data and Literature

- [Dogs Breed Dataset](https://www.kaggle.com/datasets/gauravduttakiit/dogs-breed-dataset) - Kaggle image dataset organized for dog-breed recognition and machine-learning experiments.
- [French Bulldog Research on PubMed](https://pubmed.ncbi.nlm.nih.gov/?term=French%20Bulldog) - Live PubMed literature search for research related to French Bulldogs.
- [Mendeley Literature Search](https://www.mendeley.com/search/) - Search interface for discovering scholarly literature indexed by Mendeley.
- [Shared Google Colab Notebook](https://colab.research.google.com/drive/1_fOv3dDiEq-0HvU5g6IY7Omv24ApgQ-8) - Saved cloud notebook whose title and contents depend on the owner's sharing permissions.
- [Veterinary Clinics of North America: Small Animal Practice](https://www.sciencedirect.com/journal/veterinary-clinics-of-north-america-small-animal-practice) - Peer-reviewed veterinary review journal focused on clinical care for small animals.

### Organizations and Open Science

- [Animals in NIH Research](https://grants.nih.gov/policy-and-compliance/policy-topics/air) - NIH policies and resources governing humane care, alternatives, and compliance for animals in funded research.
- [Open Bioinformatics Foundation](https://www.open-bio.org/wiki/Main_Page) - Volunteer nonprofit supporting open-source bioinformatics projects, events, and communities.
- [Open Energy Modelling Initiative](https://openmod-initiative.org/) - Community promoting open models, data, and practices for energy-system research.
- [Open Science](https://en.wikipedia.org/wiki/Open_science) - Overview of practices that make scientific research, data, methods, and communication openly accessible.
- [Royal Veterinary College Research](https://www.rvc.ac.uk/research) - Research programs, centers, facilities, and publications from the Royal Veterinary College.
- [World Small Animal Veterinary Association Guidelines](https://wsava.org/global-guidelines/) - Global clinical guidelines and professional resources for companion-animal veterinary care.

### Scientific Computing

- [Blosc](https://blosc.org/) - Open-source ecosystem for high-performance compression of binary data, arrays, and scientific datasets.
- [gnuplot](https://gnuplot.info/) - Portable command-line graphing utility for interactive data exploration and publication-quality plots.
- [Numerical Analysis](https://github.com/urbainvaes/numerical_analysis) - Course materials, notes, and computational examples for numerical-analysis methods.
- [TileDB Build Instructions](https://github.com/TileDB-Inc/TileDB/blob/dev/doc/dev/BUILD.md) - Developer documentation for building the TileDB multidimensional-array database from source.
- [TileDB Python Source Build](https://docs.tiledb.com/main/how-to/installation/building-from-source/python) - Instructions for building TileDB's Python bindings and native dependencies from source.

### Scholarly Publishing

- [Journal of Open Source Software](https://joss.theoj.org/) - Developer-friendly, peer-reviewed journal for research software packages and their scholarly metadata.

## Work and Learning

### Communities and Events

- [Mastodon Explore](https://mastodon.social/explore) - Public discovery page for trending posts, tags, news, and profiles on the Mastodon social network.
- [WAGO Community](https://www.wago.community/) - Community forum and knowledge hub for industrial automation, control systems, and WAGO products.

### Learning and Careers

- [Linux Professional Institute](https://www.lpi.org/) - Vendor-neutral Linux and open-source certification, learning, and professional-development organization.
- [Wonderlic Test Practice](https://wonderlictestpractice.com/) - Practice questions and preparation material for Wonderlic-style cognitive ability assessments.

### Workspace

- [Depot](https://depot.dev/) - Remote container-build platform focused on fast BuildKit execution, caching, and CI acceleration.
- [FEZIBO Triple-Motor L-Shaped Standing Desk](https://www.fezibo.com/products/triple-motor-l-shaped-corner-ergonomic-standing-desk-fezibo) - Product reference for an adjustable L-shaped standing desk with a triple-motor frame.

## Meta

- [Awesome](https://github.com/sindresorhus/awesome#readme) - The original index of curated awesome lists.
- [Awesome Lint](https://github.com/sindresorhus/awesome-lint#readme) - A linter for maintaining consistent, high-quality awesome lists.
- [Awesome Manifesto](https://github.com/sindresorhus/awesome/blob/main/awesome.md) - Principles for thoughtful and useful curation.

## Contributing

Suggestions and improvements are welcome. Please read the [contribution guidelines](CONTRIBUTING.md) before opening an issue or pull request.
