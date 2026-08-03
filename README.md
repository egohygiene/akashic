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
  - [Documentation and Publishing](#documentation-and-publishing)
  - [Shell and Terminal](#shell-and-terminal)
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
- [Meta](#meta)

## Artificial Intelligence

### Frameworks and Organizations

- [LangChain](https://github.com/langchain-ai/langchain) - Agent-engineering framework and ecosystem for building applications powered by language models.
- [Lightning AI](https://github.com/Lightning-AI) - Open-source organization behind PyTorch Lightning and tools for training, deploying, and operating AI systems.
- [NASA Intelligent Systems Division](https://www.nasa.gov/intelligent-systems-division/) - Research division developing autonomous systems, machine learning, planning, and human-centered intelligent technologies for NASA missions.
- [Rasa](https://github.com/RasaHQ) - Open-source organization developing conversational AI and agent infrastructure.

### Research

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) - Foundational paper introducing the Transformer architecture based entirely on attention mechanisms.

## Containers and Cloud

### Docker

- [Additional Build Contexts](https://docs.docker.com/reference/cli/docker/buildx/build/#build-context) - Docker Buildx reference for supplying named local, Git, HTTP, image, and OCI-layout contexts to a build.
- [Build Variables](https://docs.docker.com/build/building/variables/) - Docker documentation for build arguments, environment variables, and predefined build variables.
- [Building Best Practices](https://docs.docker.com/build/building/best-practices/) - Official guidance for efficient, maintainable, and secure image builds, including when to use `ADD` or `COPY`.
- [Building with Bake from a Compose File](https://docs.docker.com/build/bake/compose-file/) - Guide to translating Compose services into Buildx Bake targets and extending them with `x-bake`.
- [CMD and ENTRYPOINT](https://docs.docker.com/reference/dockerfile/#understand-how-cmd-and-entrypoint-interact) - Dockerfile reference explaining how `CMD` and `ENTRYPOINT` interact.
- [Compose Environment Variables](https://docs.docker.com/compose/environment-variables/envvars/) - Reference for environment variables that configure Docker Compose behavior.
- [Configure Locales in Debian and Ubuntu](https://www.tobanet.de/s/2022/11/locales-in-debian-and-ubuntu/) - Practical instructions for generating and selecting locales in Debian-derived systems and images.
- [Debian Docker Wiki](https://wiki.debian.org/Docker) - Debian-specific installation, configuration, and troubleshooting notes for Docker.
- [Docker and Dockerfile Snippets](https://brojonat.com/posts/snippets_docker/) - Practical notes and reusable examples for Docker commands and Dockerfiles.
- [Docker Best Practices by Francisco Segredo](https://medium.com/@fsegredo2000/docker-best-practices-6fa3de5f17cb) - Community article covering image construction, layering, security, and maintainability practices.
- [Docker Build Cloud Optimization](https://docs.docker.com/build-cloud/optimization/) - Guidance for improving Docker Build Cloud transfer and build performance.
- [Docker Build Output Exporters](https://docs.docker.com/build/building/export/) - Guide to exporting BuildKit results as images, filesystems, archives, or other output types.
- [Docker CLI Reference](https://docs.docker.com/reference/cli/docker/) - Official command reference for the Docker command-line interface.
- [Docker Container Time Zones](https://gist.github.com/sjimenez44/1b73afeae3eec26a1915b0d4d5873b8f) - Community examples for configuring time zones with Docker Engine, Dockerfiles, Compose, volumes, and Kubernetes.
- [Docker Run Pseudo-TTY](https://docs.docker.com/reference/cli/docker/container/run/#tty) - Official reference for allocating a pseudo-terminal with `docker container run`.
- [Forcing Docker to Use `linux/amd64` on macOS](https://stackoverflow.com/questions/65612411/forcing-docker-to-use-linux-amd64-platform-by-default-on-macos) - Community solutions for controlling the default image platform on Apple Silicon.
- [Installing or Changing Locales on Debian](https://serverfault.com/questions/54591/how-to-install-change-locale-on-debian) - Long-running community reference for installing locale data and setting Debian's default locale.
- [Installing Specific APT Versions in Docker](https://www.reddit.com/r/docker/comments/kvhc3m/best_practices_for_install_specific_version_from/) - Community discussion of version pinning, repository snapshots, and reproducibility tradeoffs in Debian-based images.
- [Setting the Time Zone in a Docker Container](https://stackoverflow.com/questions/57607381/how-do-i-change-timezone-in-a-docker-container) - Community approaches for setting `TZ`, installing `tzdata`, or mounting host time-zone files.

### Examples and Deployment

- [Google Cloud Click to Deploy](https://github.com/GoogleCloudPlatform/click-to-deploy) - Source for deployable application solutions published through Google Cloud Marketplace.
- [IBM Guestbook Example](https://github.com/IBM/guestbook) - Archived multi-tier Kubernetes and Docker sample with a web frontend and replicated Redis services.

### Package Management and Reproducibility

- [APT Utils](https://www.mankier.com/package/apt-utils) - Man pages for Debian package-management utilities such as `apt-ftparchive` and `apt-sortpkgs`.
- [Apt-Cacher NG](https://www.unix-ag.uni-kl.de/~bloch/acng/html/index.html) - Documentation for a caching proxy specialized for software package downloads.
- [Reproducible Builds Website](https://salsa.debian.org/reproducible-builds/reproducible-website) - Source repository for the Reproducible Builds project website and its guidance on deterministic software artifacts.
- [repro-sources-list.sh](https://github.com/reproducible-containers/repro-sources-list.sh) - Configures APT and related package sources to use reproducible snapshots.

### Platforms and Storage

- [MinIO](https://github.com/minio) - Open-source organization building S3-compatible object-storage software and related tooling.
- [OpenStack](https://www.openstack.org/) - Open-source infrastructure platform for managing compute, storage, and networking resources.

### Runtimes and Specifications

- [BuildKit Multi-Platform Images](https://github.com/moby/buildkit#building-multi-platform-images) - BuildKit documentation for cross-compilation and multi-platform image construction.
- [Compose Specification Schema](https://github.com/compose-spec/compose-spec/blob/main/schema/compose-spec.json) - Canonical JSON Schema for validating Compose application models.
- [containerd](https://containerd.io/) - Industry-standard container runtime focused on simplicity, robustness, and portability.
- [Kata Containers](https://katacontainers.io/) - Secure container runtime that combines lightweight virtual machines with a container workflow.
- [OCI Image Configuration](https://github.com/opencontainers/image-spec/blob/main/config.md) - Open Container Initiative specification for image configuration, runtime execution parameters, and filesystem changes.
- [OCI Runtime Implementations](https://github.com/opencontainers/runtime-spec/blob/main/implementations.md) - Catalog of implementations of the Open Container Initiative runtime specification.
- [tonistiigi/binfmt](https://github.com/tonistiigi/binfmt) - Cross-platform emulator collection distributed as Docker images for BuildKit and other container workflows.

## Developer Tools

### Application Development

- [FastAPI](https://github.com/fastapi) - Open-source organization maintaining FastAPI and adjacent Python web-development projects.
- [Pyodide](https://github.com/pyodide) - Python distribution for browsers and Node.js built on WebAssembly.
- [Qt for Open Source Development](https://www.qt.io/development/download-open-source) - Qt downloads and guidance for choosing and complying with its open-source licenses.
- [r-lib](https://github.com/r-lib) - R-focused organization maintaining reusable packages for development, testing, command-line interfaces, and package infrastructure.
- [spdlog](https://github.com/gabime/spdlog) - Fast, header-only or compiled C++ logging library with asynchronous logging and multiple sink types.
- [vcpkg ARM64 Linux Bootstrap Failure](https://github.com/microsoft/vcpkg/issues/39663) - Closed troubleshooting issue showing missing compiler and Ninja prerequisites while bootstrapping vcpkg on ARM64 Linux.
- [Zope Component Architecture Guide](https://github.com/baijum/zcadoc) - Book-length guide to component-based Python development with the Zope Component Architecture.

### Documentation and Publishing

- [CommonMark](https://commonmark.org/) - Strongly defined, highly compatible specification and test suite for Markdown.

### Shell and Terminal

- [bpkg](https://github.com/bpkg/bpkg) - Lightweight Bash package manager for installing shell scripts globally or as project dependencies.
- [Installing Build Essentials on macOS](https://stackoverflow.com/questions/38086451/how-to-install-build-essential-on-mac) - Community explanation of the macOS equivalents to Debian's `build-essential` package.
- [Shellharden](https://github.com/anordal/shellharden) - Corrective shell syntax highlighter that can rewrite scripts toward ShellCheck conformance.
- [Warp](https://www.warp.dev/) - Terminal-based agentic development environment with modern command editing and workflow features.

### Web Capture and Community Features

- [GitHub Profile README Guestbook](https://gist.github.com/traumverloren/a7fa4c89c27fc3adedf1ff96b0514472) - Tutorial for building a nostalgic profile guestbook using a public GitHub Gist.
- [PyWebCopy](https://github.com/rajatomar788/pywebcopy) - Python package for saving web pages locally with their images, stylesheets, scripts, and links.

## Open Source

### Collections

- [Awesome Open Source Systems](https://github.com/ishanvyas22/awesome-open-source-systems) - Curated collection of free and open-source systems grouped by practical use case.
- [Awesome SDN](https://github.com/sdnds-tw/awesome-sdn) - Curated collection of software-defined networking controllers, tools, research, and learning resources.

### Community and Governance

- [All In](https://github.com/AllInOpenSource) - Historical organization and project collection focused on advancing diversity, equity, and inclusion in open source.
- [Badging by CHAOSS](https://badging.chaoss.community/) - Peer-review badging program for recognizing inclusive open-source projects and events.
- [Cauldron](https://github.com/cauldronio/cauldron) - Open-source SaaS analytics platform built on GrimoireLab for studying software-development and community activity.
- [CHAOSS Badging on GitHub](https://github.com/badging) - Repositories and automation supporting CHAOSS diversity, equity, and inclusion badging.
- [Open Source Community Self-Selection](https://opensauced.pizza/blog/open-source-community-self-selection) - OpenSauced essay about how community signals and contribution pathways shape who participates.
- [Open Source Project Management](https://www.zenhub.com/guides/open-source-project-management) - Guide to planning, contributor coordination, roadmaps, and sustainable workflows in open-source projects.
- [TODO Group](https://todogroup.org/) - Community of Open Source Program Office practitioners sharing governance knowledge and resources.

### Foundations and Standards

- [Drupal Association](https://www.drupal.org/association) - Nonprofit organization supporting Drupal's infrastructure, community, events, and long-term sustainability.
- [Free Software Foundation](https://www.fsf.org/about/) - Nonprofit organization advocating for computer-user freedom and free software.
- [OASIS Open](https://www.oasis-open.org/) - Nonprofit consortium developing open standards through community collaboration.
- [OpenForum Europe](https://openforumeurope.org/expertise/) - European nonprofit providing research and policy expertise on open source, standards, interoperability, and digital sovereignty.
- [Software in the Public Interest](https://www.spi-inc.org/) - Nonprofit fiscal sponsor that handles administrative work for open-source software and hardware projects.

### History and Perspectives

- [How Red Hat Helped Make Open Source a Global Phenomenon](https://www.inc.com/greg-satell/how-red-hat-scaled-from-an-unlikely-startup-to-a-major-global-enterprise.html) - Case study of Red Hat's growth and influence on commercial open source.
- [Open Source Development Labs](https://en.wikipedia.org/wiki/Open_Source_Development_Labs) - Historical overview of the nonprofit consortium that later merged with the Free Standards Group to form the Linux Foundation.
- [The Future of Open Source: SaaS, the Final Frontier](https://sentry.io/resources/the-future-of-open-source-saas-the-final-frontier/) - Sentry's perspective on sustainable open-source software and SaaS business models.
- [The Product Approach to Open Source Communities](https://stackoverflow.blog/2023/11/08/the-product-approach-to-open-source-communities/) - Essay on applying product thinking to the design and growth of open-source communities.

### Licensing and Compliance

- [SPDX License List Data](https://github.com/spdx/license-list-data) - Machine-readable SPDX License List data in JSON, RDFa, text, HTML, and other formats.

### Programs and Support

- [Docker-Sponsored Open Source Program](https://www.docker.com/community/open-source/application/) - Benefits and application details for eligible non-commercial open-source projects using Docker.
- [Goldman Sachs Open Source](https://developer.gs.com/discover/open-source) - Catalog of Goldman Sachs open-source projects and its approach to contributing software publicly.
- [Microsoft Open Source Program](https://opensource.microsoft.com/program/) - Overview of Microsoft's internal open-source governance, tooling, and program office.
- [Palisadoes Foundation](https://www.palisadoes.org/) - Nonprofit using open-source software projects and mentorship to expand STEM opportunities for underserved communities.
- [Recurse Center](https://www.recurse.com/) - Self-directed, community-based programming retreat with a free and open educational environment.

## Security

### Organizations, Tools, and Learning

- [Falco](https://www.sysdig.com/opensource/falco) - Cloud-native runtime security tool for detecting unexpected behavior in hosts and containers.
- [Installing the Social-Engineer Toolkit on Ubuntu](https://askubuntu.com/questions/394141/how-to-install-social-engineering-toolkit) - Historical community Q&A about installing the penetration-testing toolkit on Ubuntu.
- [Metasploit](https://www.metasploit.com/) - Official project and product site for the Metasploit penetration-testing ecosystem.
- [Metasploit Framework](https://github.com/rapid7/metasploit-framework) - Open-source penetration-testing framework and exploit-development platform.
- [OWASP Dependency-Check Container Image](https://hub.docker.com/r/owasp/dependency-check) - Official container image for scanning application dependencies for publicly disclosed vulnerabilities.
- [TrustedSec](https://github.com/trustedsec) - Open-source security tools and research from the TrustedSec team.

### Vulnerability Data

- [Bitnami Vulnerability Database](https://github.com/bitnami/vulndb) - Vulnerability metadata collected for Bitnami applications and container images.
- [GitHub Advisory Database for npm](https://github.com/advisories?query=type%3Areviewed+ecosystem%3Anpm) - Live view of reviewed security advisories affecting packages in the npm ecosystem.
- [Global Security Database](https://gsd.id/) - Community-led vulnerability database and identifier system with openly available data.
- [R Consortium Advisory Database](https://github.com/RConsortium/r-advisory-database) - Security advisories for packages published through CRAN and Bioconductor.
- [RubySec](https://github.com/rubysec) - Community-maintained Ruby security advisories and tooling, including the Ruby Advisory Database.

## TeX and Typesetting

### Accessibility and Web

- [ASTER](https://emacspeak.sourceforge.net/raman/aster/aster-toplevel.html) - Historical audio typesetting system for rendering structured scientific and mathematical documents as speech.
- [axessibility](https://github.com/integr-abile/axessibility) - LaTeX package that exposes mathematical formulae to screen readers and braille displays.
- [How to Make Accessible PDF](https://www.latex-project.org/news/2024/07/08/tagging/) - LaTeX Project update and entry point for current tagged-PDF guidance, examples, and compatibility tracking.
- [MathJax](https://github.com/mathjax/MathJax) - Accessible JavaScript display engine for mathematics in web browsers.
- [tagpdf](https://github.com/latex3/tagpdf) - LaTeX support code for producing tagged and accessible PDF documents.

### Authoring and Editing

- [BaKoMa TeX](https://www.bakoma-tex.com/) - Legacy commercial TeX system known for visual, source-synchronized document editing.
- [BibView-X](https://ctan.org/pkg/bibview-x) - Legacy X Window graphical editor for creating, searching, and moving entries between BibTeX databases.
- [JaxEdit](https://zohooo.github.io/jaxedit/) - Browser-based LaTeX editor with live preview, sharing, and presentation support.
- [LaTeXiT](https://www.chachatelier.fr/latexit/latexit-downloads.php?lang=en) - macOS utility for typesetting LaTeX equations and exporting them into other applications.
- [LTeX](https://marketplace.visualstudio.com/items?itemName=valentjn.vscode-ltex) - LanguageTool-powered grammar and spell checker for LaTeX, Markdown, and related formats in Visual Studio Code.
- [nics](https://nics.nilcons.com/) - Code-first presentation system that produces browser-based slides and printable PDF output.
- [RefDB](https://refdb.sourceforge.net/) - Legacy reference and bibliography database with support for multiple output formats.

### Build, Conversion, and Automation

- [CaTeX](https://github.com/Alexis-benoist/CaTeX) - Legacy Python utility that concatenates LaTeX documents while merging their preambles.
- [DANTE LaTeX Action](https://github.com/dante-ev/latex-action) - Community-maintained fork of `xu-cheng/latex-action` for compiling LaTeX documents in GitHub Actions.
- [LaTeX2HTML](https://ctan.org/pkg/latex2html) - Perl-based converter that translates LaTeX documents into HTML.
- [Latexmake.py](https://github.com/JanKanis/latexmk.py) - Legacy Python build tool that automates LaTeX command sequences and can watch source files for changes.
- [Latexmk](https://www.cantab.net/users/johncollins/latexmk/index.html) - Build tool that reruns LaTeX and auxiliary programs until references and generated outputs are current.
- [Pandoc Action Example](https://github.com/pandoc/pandoc-action-example) - Reference repository for converting documents with Pandoc in GitHub Actions.
- [plasTeX](https://github.com/plastex) - Python framework that parses LaTeX documents and renders them through configurable output templates.
- [Tectonic](https://github.com/tectonic-typesetting/tectonic) - Modern, self-contained TeX and LaTeX engine powered by XeTeX and TeX Live.
- [Texi2HTML](https://www.nongnu.org/texi2html/) - Legacy converter for transforming Texinfo documents into HTML.
- [TrY](https://ctan.org/pkg/try) - Linux script that automates TeX and LaTeX compilation using commands embedded in document comments.
- [xu-cheng/latex-action](https://github.com/xu-cheng/latex-action) - GitHub Action for compiling LaTeX documents with configurable engines, working directories, and build arguments.

### Distributions and Package Management

- [Island of TeX](https://gitlab.com/islandoftex) - TeX-focused GitLab community maintaining container images, packaging infrastructure, and related tooling.
- [MiKTeX](https://miktex.org/) - Cross-platform TeX distribution with on-demand package installation and an integrated package manager.
- [TeX Live Utility](https://amaxwell.github.io/tlutility/) - Native macOS interface for managing, updating, and configuring a TeX Live installation.

### Drawing and Visualization

- [Awesome LaTeX Drawing](https://github.com/xinychen/awesome-latex-drawing) - Curated examples for drawing models, tensors, technical systems, and scientific illustrations in LaTeX.
- [PetarV-/TikZ](https://github.com/PetarV-/TikZ) - Collection of reusable PGF and TikZ figures for machine learning, mathematics, and computer science.
- [TeXample.net](https://texample.net/) - Searchable gallery of LaTeX and TikZ examples organized by topic, feature, library, and package.
- [tikzplotlib](https://github.com/nschloe/tikzplotlib) - Python tool that exports Matplotlib figures as PGFPlots and TikZ for native LaTeX integration.

### Examples and Templates

- [Dialogue Conference LaTeX Template](https://github.com/nlpub/dialogue-latex) - Archived LaTeX template and Pandoc workflow for submissions to the Dialogue conference.
- [LaTeX Templates Forum](https://latex.org/forum/viewforum.php?f=57) - LaTeX.org community forum for finding, discussing, and troubleshooting document templates.
- [Martin Thoma's LaTeX Examples](https://github.com/MartinThoma/LaTeX-examples) - Broad collection of working examples demonstrating LaTeX features, packages, and document patterns.
- [PracTeX Journal LaTeX Class](https://www.tug.org/pracjourn/styles/latex/) - Source, documentation, and sample files for the journal's LaTeX class.
- [Sized Dependent Types Thesis Source](https://github.com/ionathanch/msc-thesis) - Complete LaTeX and Agda source for a master's thesis, including its class, bibliography, figures, and build configuration.
- [VCLanNguyen Thesis](https://github.com/VCLanNguyen/Thesis) - Complete public thesis source repository useful as a real-world LaTeX project example.

### Learning and Reference

- [Comprehensive LaTeX Symbol List Data](https://mirror.math.princeton.edu/pub/CTAN/info/symbols/comprehensive/SYMLIST) - Plain-text mapping of user-facing commands from the Comprehensive LaTeX Symbol List.
- [Developing Training Materials on GitHub](https://uk-tug-archive.tug.org/2011/07/11/developing-training-materials-on-github/) - UK-TUG article about collaboratively maintaining a beginner LaTeX course with GitHub.
- [LaTeX.net](https://latex.net/) - Community hub publishing LaTeX news, tutorials, books, examples, and package articles.
- [Learn LaTeX](https://www.learnlatex.org/) - Interactive, multilingual introduction to LaTeX with lessons and runnable examples.
- [Nicola Talbot on LaTeX.net](https://latex.net/author/nicola/) - Articles and resources from the author of several LaTeX books and packages.
- [TeXdoc Online](https://texdoc.org/) - Web interface for finding and opening documentation shipped with TeX distributions.
- [TeXfragen](https://texfragen.de/) - German-language LaTeX knowledge base, FAQ, and community resource.
- [The Visual LaTeX FAQ](https://ctan.math.illinois.edu/info/visualfaq/visualFAQ.pdf) - Illustrated problem-to-solution index for common LaTeX formatting questions.
- [What Is LaTeX?](https://scottmcpeak.com/latex/whatislatex.html) - Concise conceptual introduction to LaTeX, its workflow, and the kinds of documents it suits.

### Packages and Language

- [LaTeX3](https://www.latex-project.org/latex3/) - LaTeX Project work on the LaTeX3 programming layer and the evolution of the format.
- [microtype](https://ctan.org/pkg/microtype) - Configurable character protrusion, font expansion, kerning, tracking, and other microtypographic refinements.
- [minted](https://mirrors.rit.edu/CTAN/macros/latex/contrib/minted/minted.pdf) - Package documentation for syntax-highlighted source-code listings powered by Pygments.
- [nomencl](https://github.com/borisveytsman/nomencl) - LaTeX package for generating and formatting nomenclatures with MakeIndex.
- [PygmenTeX](https://www.ctan.org/pkg/pygmentex) - Python and LaTeX tooling for inserting Pygments-highlighted code into TeX documents.
- [xsavebox](https://gitlab.com/agrahn/xsavebox) - Package for reusing typeset content through PDF Form XObjects without duplicating output code.

## Scientific Research

### Data and Literature

- [Dogs Breed Dataset](https://www.kaggle.com/datasets/gauravduttakiit/dogs-breed-dataset) - Kaggle image dataset organized for dog-breed recognition and machine-learning experiments.
- [French Bulldog Research on PubMed](https://pubmed.ncbi.nlm.nih.gov/?term=French%20Bulldog) - Live PubMed literature search for research related to French Bulldogs.

### Organizations and Open Science

- [Open Bioinformatics Foundation](https://www.open-bio.org/wiki/Main_Page) - Volunteer nonprofit supporting open-source bioinformatics projects, events, and communities.
- [Open Science](https://en.wikipedia.org/wiki/Open_science) - Overview of practices that make scientific research, data, methods, and communication openly accessible.

### Scientific Computing

- [Blosc](https://blosc.org/) - Open-source ecosystem for high-performance compression of binary data, arrays, and scientific datasets.
- [gnuplot](https://gnuplot.info/) - Portable command-line graphing utility for interactive data exploration and publication-quality plots.
- [Numerical Analysis](https://github.com/urbainvaes/numerical_analysis) - Course materials, notes, and computational examples for numerical-analysis methods.
- [TileDB Build Instructions](https://github.com/TileDB-Inc/TileDB/blob/dev/doc/dev/BUILD.md) - Developer documentation for building the TileDB multidimensional-array database from source.

## Meta

- [Awesome](https://github.com/sindresorhus/awesome#readme) - The original index of curated awesome lists.
- [Awesome Lint](https://github.com/sindresorhus/awesome-lint#readme) - A linter for maintaining consistent, high-quality awesome lists.
- [Awesome Manifesto](https://github.com/sindresorhus/awesome/blob/main/awesome.md) - Principles for thoughtful and useful curation.

## Contributing

Suggestions and improvements are welcome. Please read the [contribution guidelines](CONTRIBUTING.md) before opening an issue or pull request.
