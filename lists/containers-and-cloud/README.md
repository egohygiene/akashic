<!--lint disable awesome-git-repo-age-->

# Awesome Containers and Cloud [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> Containers, Docker, deployment, storage, runtimes, and reproducible infrastructure.

Part of [akashic](../../README.md), the Ego Hygiene knowledge collection.

## Contents

- [Docker](#docker)
- [Examples and Deployment](#examples-and-deployment)
- [Package Management and Reproducibility](#package-management-and-reproducibility)
- [Platforms and Storage](#platforms-and-storage)
- [Runtimes and Specifications](#runtimes-and-specifications)


## Docker

- [Additional Build Contexts](https://docs.docker.com/reference/cli/docker/buildx/build/#build-context) - Docker Buildx reference for supplying named local, Git, HTTP, image, and OCI-layout contexts to a build.
- [Bit-for-Bit Reproducible Docker Builds](https://medium.com/nttlabs/bit-for-bit-reproducible-builds-with-dockerfile-7cc2b9faed9f) - Practical article on controlling package, timestamp, and image metadata sources to produce identical Docker builds.
- [Build Cache](https://docs.docker.com/build/cache/) - Docker guide to cache storage, reuse, invalidation, exporters, and optimization.
- [Build Cache Backends](https://docs.docker.com/build/cache/backends/) - Official reference for exporting and importing BuildKit cache through registry, local, cloud, and CI-oriented backends.
- [Build Cache Garbage Collection](https://docs.docker.com/build/cache/garbage-collection/) - Guide to automatic and configured garbage collection for reclaiming BuildKit cache storage.
- [Build Cache Invalidation](https://docs.docker.com/build/cache/invalidation/) - Reference for how Docker determines cache matches and how to force cache invalidation safely.
- [Build Checks](https://docs.docker.com/reference/build-checks/) - Canonical reference for Dockerfile static checks, rule names, configuration, warning suppression, and validation behavior.
- [Build Contexts](https://docs.docker.com/build/concepts/context/) - Conceptual guide to local, remote, named, and empty contexts supplied to Docker builds.
- [Build Variables](https://docs.docker.com/build/building/variables/) - Docker documentation for build arguments, environment variables, and predefined build variables.
- [Building a Dockerfile Frontend](https://matt-rickard.com/building-a-new-dockerfile-frontend) - Walkthrough of implementing a custom BuildKit frontend that translates a new build language into low-level build operations.
- [Building Best Practices](https://docs.docker.com/build/building/best-practices/) - Official guidance for efficient, maintainable, and secure image builds, including when to use `ADD` or `COPY`.
- [Building Go Images](https://docs.docker.com/language/golang/build-images/) - Docker guide to containerizing Go applications with multi-stage builds and minimal runtime images.
- [Building with Bake from a Compose File](https://docs.docker.com/build/bake/compose-file/) - Guide to translating Compose services into Buildx Bake targets and extending them with `x-bake`.
- [BuildKit](https://github.com/moby/buildkit) - Concurrent, cache-efficient build toolkit that powers modern Docker image construction.
- [BuildKit Configuration](https://docs.docker.com/build/buildkit/toml-configuration/) - Reference for configuring a BuildKit daemon through `buildkitd.toml`.
- [BuildKit Frontends](https://docs.docker.com/build/buildkit/frontend/) - Guide to selecting and pinning Dockerfile syntax frontends used by BuildKit.
- [BuildKit Overview](https://docs.docker.com/build/buildkit/) - Official overview of BuildKit architecture, operation, compatibility, and migration from the legacy builder.
- [BuildKit Reproducible Builds](https://github.com/moby/buildkit/blob/master/docs/build-repro.md) - BuildKit guidance for deterministic image construction, stable timestamps, source metadata, and remaining reproducibility caveats.
- [BuildKit SBOM Attestation Protocol](https://github.com/moby/buildkit/blob/master/docs/attestations/sbom-protocol.md) - BuildKit protocol describing scanner requests and software-bill-of-materials attestation responses.
- [Buildx Bake CLI Reference](https://docs.docker.com/reference/cli/docker/buildx/bake/) - Command reference for orchestrating groups of Buildx targets with Bake definitions.
- [Buildx Bake Deep Dive](https://depot.dev/blog/buildx-bake-deep-dive) - Detailed guide to Buildx Bake files, target inheritance, matrices, variables, caching, and multi-platform builds.
- [Buildx Build Reference](https://docs.docker.com/reference/cli/docker/buildx/build/) - Complete reference for Buildx build inputs, outputs, caching, attestations, and platform controls.
- [Buildx Compose File Support](https://github.com/docker/buildx/pull/721) - Historical implementation pull request adding Compose files as inputs to Buildx Bake.
- [Buildx Compose Platform Issue 759](https://github.com/docker/buildx/issues/759) - Historical Buildx issue documenting platform-field behavior when Bake consumes Compose definitions on Apple Silicon.
- [Buildx Driver Configuration](https://docs.docker.com/build/builders/drivers/) - Comparison and configuration guide for Buildx builder drivers and their capabilities.
- [CMD and ENTRYPOINT](https://docs.docker.com/reference/dockerfile/#understand-how-cmd-and-entrypoint-interact) - Dockerfile reference explaining how `CMD` and `ENTRYPOINT` interact.
- [Compose Buildx Bake Issue 9832](https://github.com/docker/compose/issues/9832) - Saved Compose discussion about integrating Buildx Bake behavior into multi-service build workflows.
- [Compose Default Platform Issue 9889](https://github.com/docker/compose/issues/9889) - Historical Compose issue about DOCKER_DEFAULT_PLATFORM behavior when pulling and building images on Apple Silicon.
- [Compose Deploy Specification](https://docs.docker.com/reference/compose-file/deploy/) - Compose specification for deployment constraints, resources, replicas, placement, and update behavior.
- [Compose Development Specification](https://docs.docker.com/reference/compose-file/develop/) - Compose reference for development-time synchronization and rebuild behavior.
- [Compose Environment Interpolation](https://docs.docker.com/reference/compose-file/interpolation/) - Rules for variable interpolation and escaping within Compose configuration files.
- [Compose Environment Variable Sources](https://docs.docker.com/compose/environment-variables/set-environment-variables/) - Guide to setting container environment variables through Compose configuration and environment files.
- [Compose Environment Variables](https://docs.docker.com/compose/environment-variables/envvars/) - Reference for environment variables that configure Docker Compose behavior.
- [Compose Include](https://docs.docker.com/reference/compose-file/include/) - Reference for composing modular applications by including external Compose files.
- [Compose Project Names](https://docs.docker.com/compose/project-name/) - Guide to setting and resolving Compose project names and resource-name isolation.
- [Compose Services Reference](https://docs.docker.com/reference/compose-file/services/) - Reference for service-level Compose configuration including images, builds, networks, volumes, and runtime settings.
- [Compose with Multiple Files](https://docs.docker.com/compose/multiple-compose-files/) - Guide to merging, extending, and layering multiple Compose files for different environments.
- [Configure Locales in Debian and Ubuntu](https://www.tobanet.de/s/2022/11/locales-in-debian-and-ubuntu/) - Practical instructions for generating and selecting locales in Debian-derived systems and images.
- [Cross-Compiling Multi-Platform Docker Images](https://www.docker.com/blog/faster-multi-platform-builds-dockerfile-cross-compilation-guide/) - Docker guide to faster multi-platform builds through native cross-compilation and BuildKit platform arguments.
- [Debian Docker Wiki](https://wiki.debian.org/Docker) - Debian-specific installation, configuration, and troubleshooting notes for Docker.
- [Dive](https://github.com/wagoodman/dive) - Terminal interface for exploring container-image layers, contents, wasted space, and efficiency changes.
- [Docker ADD Instruction](https://docs.docker.com/reference/dockerfile/#add) - Dockerfile reference for adding local or remote files, archives, and Git repositories to an image.
- [Docker and Dockerfile Snippets](https://brojonat.com/posts/snippets_docker/) - Practical notes and reusable examples for Docker commands and Dockerfiles.
- [Docker Bake](https://docs.docker.com/build/bake/) - Official guide to defining and executing declarative Buildx build graphs with Bake.
- [Docker Best Practices by Francisco Segredo](https://medium.com/@fsegredo2000/docker-best-practices-6fa3de5f17cb) - Community article covering image construction, layering, security, and maintainability practices.
- [Docker Build Attestations in GitHub Actions](https://docs.docker.com/build/ci/github-actions/attestations/) - Guide to producing provenance and SBOM attestations while building images in GitHub Actions.
- [Docker Build Cloud Optimization](https://docs.docker.com/build-cloud/optimization/) - Guidance for improving Docker Build Cloud transfer and build performance.
- [Docker Build Output Exporters](https://docs.docker.com/build/building/export/) - Guide to exporting BuildKit results as images, filesystems, archives, or other output types.
- [Docker Build Push Action](https://github.com/docker/build-push-action) - Official GitHub Action for building and publishing images with Buildx.
- [Docker Builders](https://docs.docker.com/build/builders/) - Overview of Buildx builder instances, selected builders, drivers, nodes, and build contexts.
- [Docker Buildx](https://github.com/docker/buildx) - Docker CLI plugin that exposes BuildKit capabilities for multi-platform builds, advanced caching, exporters, and Bake.
- [Docker Buildx CLI](https://docs.docker.com/reference/cli/docker/buildx/) - Command index for creating builders, running builds, using Bake, inspecting history, and managing Buildx resources.
- [Docker Built-In Build Arguments](https://docs.docker.com/reference/dockerfile/#buildkit-built-in-build-args) - Dockerfile reference for BuildKit-provided proxy, platform, and build metadata arguments.
- [Docker Checkpoint Reference](https://docs.docker.com/reference/cli/docker/checkpoint/) - Experimental CLI reference for checkpointing and restoring containers with CRIU.
- [Docker CLI Environment Variables](https://docs.docker.com/reference/cli/docker/#environment-variables) - Reference for environment variables that configure Docker CLI behavior, contexts, TLS, and content trust.
- [Docker CLI Reference](https://docs.docker.com/reference/cli/docker/) - Official command reference for the Docker command-line interface.
- [Docker Compose Time Zones](https://confluence.atlassian.com/kb/how-to-set-the-timezone-for-docker-container-976780914.html) - Atlassian knowledge-base guide to configuring time zones for Docker containers.
- [Docker Compose Viz](https://docs.docker.com/reference/cli/docker/compose/alpha/viz/) - Experimental Compose command reference for rendering a service model as a dependency graph.
- [Docker Container Time Zones](https://gist.github.com/sjimenez44/1b73afeae3eec26a1915b0d4d5873b8f) - Community examples for configuring time zones with Docker Engine, Dockerfiles, Compose, volumes, and Kubernetes.
- [Docker Desktop Integrated Terminal](https://docs.docker.com/desktop/use-desktop/container/#integrated-terminal) - Guide to opening and using an interactive terminal inside a container from Docker Desktop.
- [Docker Engine Network Reference](https://docs.docker.com/engine/network/) - Official guide to container networking drivers, DNS, port publishing, and network configuration.
- [Docker Engine Security](https://docs.docker.com/engine/security/#linux-kernel-capabilities) - Security overview covering namespaces, control groups, daemon exposure, Linux capabilities, and hardening considerations.
- [Docker Extensions](https://www.docker.com/products/extensions/) - Catalog and platform for integrating third-party developer tools into Docker Desktop.
- [Docker GitHub Actions](https://docs.docker.com/build/ci/github-actions/) - Official patterns for building, testing, signing, and publishing images with GitHub Actions.
- [Docker Hardened Images Become Open Source](https://thenewstack.io/dockers-sets-free-the-hardened-container-images/) - Article covering Docker's release of hardened, minimal, security-maintained container images under an open-source model.
- [Docker Language Guides](https://docs.docker.com/language/) - Official language-specific guides for containerizing, developing, testing, and deploying applications.
- [Docker Metadata Action](https://github.com/docker/metadata-action) - Official GitHub Action for generating normalized image tags and Open Container Initiative labels.
- [Docker Object Labels](https://docs.docker.com/engine/manage-resources/labels/) - Guide to attaching, querying, and managing metadata labels on images, containers, volumes, networks, and other Docker objects.
- [Docker Official Images Guide](https://docs.docker.com/trusted-content/official-images/) - Guide to Docker Official Images, their review model, supported tags, and trust properties.
- [Docker Official Images Security and Transparency](https://www.docker.com/blog/enhancing-security-and-transparency-with-docker-official-images/) - Docker article on provenance, vulnerability visibility, and trust improvements for Official Images.
- [Docker Run Pseudo-TTY](https://docs.docker.com/reference/cli/docker/container/run/#tty) - Official reference for allocating a pseudo-terminal with `docker container run`.
- [Docker Run Sysctls](https://docs.docker.com/reference/cli/docker/container/run/#sysctl) - Reference for setting namespaced kernel parameters when running containers.
- [Docker Scout Action](https://github.com/docker/scout-action) - Official GitHub Action for Docker Scout vulnerability analysis, policy evaluation, and comparison workflows.
- [Docker Scout Automatic Remediation](https://docs.docker.com/scout/policy/remediation/#automatic-base-image-updates) - Guide to Docker Scout remediation pull requests that automatically update vulnerable base-image references.
- [Docker Security Options](https://docs.docker.com/reference/cli/docker/container/run/#security-opt) - Docker run reference for configuring labels, seccomp, AppArmor, credentials, and other container security profiles.
- [Docker Setup QEMU Action](https://github.com/docker/setup-qemu-action) - Official GitHub Action for installing QEMU emulators before multi-platform Buildx workflows.
- [Docker Volumes](https://docs.docker.com/engine/storage/volumes/) - Official guide to persistent Docker-managed storage, volume lifecycle, mounts, sharing, backup, and drivers.
- [Docker-Sponsored Open Source Program](https://docs.docker.com/trusted-content/dsos-program/) - Program providing qualifying noncommercial open-source projects with Docker subscriptions and trusted-content benefits.
- [Dockerfile APT Cache Mounts](https://docs.docker.com/reference/dockerfile/#example-cache-apt-packages) - Dockerfile example using persistent cache mounts to accelerate APT metadata and package downloads.
- [Dockerfile Best Practices by Hexops](https://github.com/hexops-graveyard/dockerfile) - Archived guide to writing production-oriented Dockerfiles and minimizing image complexity.
- [Dockerfile Frontend Image](https://hub.docker.com/r/docker/dockerfile) - Official container image distributing versioned Dockerfile syntax frontends for BuildKit.
- [Dockerfile Reference](https://docs.docker.com/reference/dockerfile/) - Canonical reference for Dockerfile syntax, instructions, parser directives, and build checks.
- [Forcing Docker to Use `linux/amd64` on macOS](https://stackoverflow.com/questions/65612411/forcing-docker-to-use-linux-amd64-platform-by-default-on-macos) - Community solutions for controlling the default image platform on Apple Silicon.
- [Hadolint](https://github.com/hadolint/hadolint) - Dockerfile linter that applies image-building best practices and uses ShellCheck to inspect shell code in RUN instructions.
- [Installing or Changing Locales on Debian](https://serverfault.com/questions/54591/how-to-install-change-locale-on-debian) - Long-running community reference for installing locale data and setting Debian's default locale.
- [Installing Specific APT Versions in Docker](https://www.reddit.com/r/docker/comments/kvhc3m/best_practices_for_install_specific_version_from/) - Community discussion of version pinning, repository snapshots, and reproducibility tradeoffs in Debian-based images.
- [Making Better Docker Images](https://medium.com/@chamilad/lets-make-your-docker-image-better-than-90-of-existing-ones-8b1e5de950d) - Community article on improving container-image layering, caching, dependency installation, and runtime design.
- [Managing Buildx Builders](https://docs.docker.com/build/builders/manage/) - Guide to creating, inspecting, selecting, and removing Docker Buildx builders.
- [Minimal Scratch Images](https://docs.docker.com/build/building/base-images/#create-a-minimal-base-image-using-scratch) - Official example for constructing minimal base images from the empty `scratch` image.
- [Moby PatternMatcher](https://github.com/moby/patternmatcher) - Go library implementing Docker-style include, exclude, wildcard, and ignore-file matching rules.
- [Multi-Platform Builds](https://docs.docker.com/build/building/multi-platform/) - Official Docker guide to emulation, multiple native nodes, and cross-compilation for multi-architecture images.
- [Multi-Platform Docker Builds](https://www.docker.com/blog/multi-platform-docker-builds/) - Docker article explaining emulation, cross-compilation, Buildx, and multi-platform image manifests.
- [Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/) - Guide to separating build and runtime stages to produce smaller, cleaner images.
- [Noninteractive Debian Locale Configuration](https://serverfault.com/questions/362903/how-do-you-set-a-locale-non-interactively-on-debian-ubuntu) - Community techniques for generating and selecting Debian or Ubuntu locales from unattended scripts and Dockerfiles.
- [OCI and Docker Exporters](https://docs.docker.com/build/exporters/oci-docker/) - Buildx guide to exporting image results as OCI or Docker-layout tar archives.
- [Pinning Operating-System Packages in Images](https://devops.stackexchange.com/questions/10333/how-to-pin-os-package-versions-in-docker-image) - Community discussion of package version pinning and reproducibility tradeoffs in container images.
- [Publishing Compose Build Images](https://docs.docker.com/reference/compose-file/build/#publishing-built-images) - Compose guidance for tagging built images so they can be pushed to a registry.
- [Reproducible Builds with GitHub Actions](https://docs.docker.com/build/ci/github-actions/reproducible-builds/) - Guide to controlling timestamps and metadata so Docker image builds can produce reproducible outputs.
- [Running `linux/arm64` Builds with Compose](https://stackoverflow.com/questions/59756123/use-buildx-build-linux-arm64-in-docker-compose-file) - Community guidance for combining Compose configuration with Buildx cross-platform builds.
- [Setting the Time Zone in a Docker Container](https://stackoverflow.com/questions/57607381/how-do-i-change-timezone-in-a-docker-container) - Community approaches for setting `TZ`, installing `tzdata`, or mounting host time-zone files.
- [Using Bake for Multi-Platform Compose Builds](https://stackoverflow.com/questions/65807281/how-to-use-docker-buildx-bake-to-build-docker-compose-containers-for-both-linux) - Community example of combining Buildx Bake, Compose, and multi-platform image targets.
- [xx](https://github.com/tonistiigi/xx) - Cross-compilation helpers for Dockerfiles that expose target-aware compilers, package managers, and architecture utilities.

## Examples and Deployment

- [Akuity Guestbook](https://github.com/akuity/guestbook) - GitOps guestbook example used to demonstrate Argo CD and declarative Kubernetes delivery.
- [Apt-Cacher NG Container Repository](https://github.com/ashang/apt-cacher-ng) - Container packaging and configuration for running Apt-Cacher NG.
- [Balena Dockerfile Tips and Tricks](https://blog.balena.io/our-dockerfile-tips-tricks/) - Practical container-image techniques collected from building and operating Balena device images.
- [CNCF Distribution Registry Deployment](https://distribution.github.io/distribution/about/deploying/) - Current deployment guide for running and configuring the open-source CNCF Distribution container registry server.
- [Cron in Alpine Docker Containers](https://devopscell.com/cron/docker/alpine/linux/2017/10/30/run-cron-docker-alpine.html) - Older walkthrough for configuring BusyBox cron and foreground process handling in an Alpine-based container.
- [Debuerreotype](https://github.com/debuerreotype/debuerreotype) - Reproducible tooling used to create Debian root filesystems and Docker base images.
- [Depot Dockerfile Explorer](https://depot.dev/dockerfile-explorer) - Interactive visualization tool for inspecting Dockerfile stages, dependencies, and build structure.
- [Docker AWS SDK for C++ Example](https://github.com/ingomueller-net/docker-aws-sdk-cpp) - Docker-based example for building and packaging the AWS SDK for C++ with its native dependencies.
- [Docker Bake Action](https://github.com/docker/bake-action) - Official GitHub Action for executing Buildx Bake definitions in continuous integration.
- [Docker Buildpack Dependencies](https://github.com/docker-library/buildpack-deps) - Source for Docker Official Images that bundle common build and runtime dependencies.
- [Docker Compose Samples](https://github.com/docker/awesome-compose) - Official collection of Docker Compose samples for common application stacks, databases, frameworks, and service combinations.
- [Docker Docs Dockerfile](https://github.com/docker/docs/blob/main/Dockerfile) - Production Dockerfile used to build the official Docker documentation site.
- [Docker Login Action](https://github.com/docker/login-action) - Official GitHub Action for authenticating workflows to Docker Hub and other container registries.
- [Docker Official Images](https://github.com/docker-library) - Source, metadata, and automation repositories behind Docker Official Images.
- [Docker on GitHub](https://github.com/docker) - Official organization for Docker CLI plugins, Buildx, Compose, GitHub Actions, documentation, and supporting projects.
- [Docker Scratch Image](https://hub.docker.com/_/scratch) - Reserved empty base image used to construct minimal containers containing only explicitly copied artifacts.
- [Docker Setup Buildx Action](https://github.com/docker/setup-buildx-action) - Official GitHub Action for creating and configuring a Docker Buildx builder in CI.
- [Dockerfile Snippets by Jaffa-Cakes](https://github.com/Jaffa-Cakes/dockerfile-snippets) - Collection of reusable Dockerfile patterns for installing languages, tools, browsers, and system dependencies.
- [dockerize](https://github.com/jwilder/dockerize) - Utility for templating configuration, waiting for dependencies, and tailing files in container entrypoints.
- [Dragonfly Repository Agent Dockerfile](https://github.com/dragonflyoss/dragonfly-repository-agent/blob/73e0493fcde173c12afe487619745d7a8fd45244/Dockerfile#L19) - Pinned container-build example from Dragonfly's repository agent, preserved for its package and image-construction pattern.
- [Google Cloud Click to Deploy](https://github.com/GoogleCloudPlatform/click-to-deploy) - Source for deployable application solutions published through Google Cloud Marketplace.
- [Google Cloud Click to Deploy Docker Solutions](https://github.com/GoogleCloudPlatform/click-to-deploy/tree/master/docker) - Docker-based application solutions published through Google Cloud Click to Deploy.
- [IBM Guestbook Example](https://github.com/IBM/guestbook) - Archived multi-tier Kubernetes and Docker sample with a web frontend and replicated Redis services.
- [Josh Gross Guestbook](https://github.com/joshmgross/guestbook) - Small guestbook application preserved as a container and web-development example.
- [Kubernetes Guestbook Example](https://github.com/kubernetes/examples/blob/master/guestbook/all-in-one/guestbook-all-in-one.yaml) - Single-manifest guestbook application demonstrating a web frontend, Redis leader, replicas, and Kubernetes services.
- [MinIO Container Image](https://hub.docker.com/r/minio/minio) - Official container image for running the MinIO S3-compatible object store.
- [MinIO Container Installation](https://min.io/docs/minio/container/operations/installation.html) - Official deployment guidance for running MinIO through container images and container-oriented environments.
- [MinIO Kubernetes Deployment](https://min.io/docs/minio/kubernetes/upstream/index.html) - Archived upstream-Kubernetes deployment guidance for MinIO clusters, operators, and persistent storage.
- [MinIO Linux Installation](https://min.io/docs/minio/linux/operations/installation.html) - Official guide to installing and operating MinIO directly on Linux hosts.
- [Moby](https://github.com/moby) - Open-source organization for the Moby container engine, BuildKit, container assembly, and supporting libraries.
- [Moby Debian Root Filesystem Builder](https://github.com/moby/moby/blob/03e2923e42446dbb830c654d0eec323a0b4ef02a/contrib/mkimage/debootstrap#L82-L105) - Historical Moby script section for producing Debian root filesystems and importing them as base images.
- [Mockerfile](https://github.com/r2d4/mockerfile) - Experimental Dockerfile-compatible builder implemented with a mock-oriented development approach.
- [Quay Clair Compose Example](https://github.com/quay/clair/blob/main/docker-compose.yaml) - Reference Compose stack for running the Clair container-vulnerability scanner and its dependencies.
- [Running Cron in a Docker Container](https://stackoverflow.com/questions/37015624/how-to-run-a-cron-job-inside-a-docker-container) - Community discussion of cron process models, foreground execution, logging, and alternatives for scheduled work in containers.
- [TileDB Dockerfile Example](https://github.com/TileDB-Inc/TileDB/blob/dev/examples/Dockerfile/Dockerfile) - Reference Dockerfile for building TileDB and its development dependencies.
- [TileDB MariaDB Container Example](https://github.com/TileDB-Inc/TileDB-MariaDB/blob/master/docker/Dockerfile-server) - Historical Dockerfile for packaging the TileDB MariaDB integration as a server image.
- [Using BuildKit from Docker Compose](https://yuki-nakamura.com/2024/01/20/use-buildkit-from-docker-compose/) - Practical walkthrough for selecting BuildKit behavior and build features from Docker Compose workflows.
- [Vintage Ruby Onbuild Dockerfile](https://github.com/docker-library/ruby/blob/c43fef8a60cea31eb9e7d960a076d633cb62ba8d/2.4/jessie/onbuild/Dockerfile) - Historical Docker Official Image example illustrating the deprecated `ONBUILD` pattern.
- [wait-for-it](https://github.com/vishnubob/wait-for-it) - Shell utility that waits for a TCP host and port before launching a dependent command.
- [Wiki.js Docker Installation](https://beta.js.wiki/docs/install-using-docker) - Installation guide for deploying Wiki.js with Docker, persistent storage, and a database service.

## Package Management and Reproducibility

- [Alpine aports](https://github.com/alpinelinux/aports) - Build scripts and metadata used to produce packages for Alpine Linux repositories.
- [Alpine Linux on GitHub](https://github.com/alpinelinux) - Project organization for Alpine Linux packages, infrastructure, installers, and tooling.
- [APT Extract Templates](https://www.mankier.com/1/apt-extracttemplates) - Manual page for extracting Debconf templates and configuration scripts from Debian packages.
- [APT Package Tracker](https://tracker.debian.org/pkg/apt) - Debian tracker collecting package versions, bugs, security status, maintainers, testing migration, and source metadata for APT.
- [APT Package Trust](https://www.debian.org/doc/manuals/aptitude/ch02s05s05.en.html) - Debian Aptitude documentation explaining authenticated repositories, package signatures, and trust decisions.
- [APT Utils](https://www.mankier.com/package/apt-utils) - Man pages for Debian package-management utilities such as `apt-ftparchive` and `apt-sortpkgs`.
- [Apt-Cacher NG](https://www.unix-ag.uni-kl.de/~bloch/acng/html/index.html) - Documentation for a caching proxy specialized for software package downloads.
- [apt-get Manual](https://linux.die.net/man/8/apt-get) - Manual-page reference for retrieving, installing, upgrading, and removing packages with apt-get.
- [Arch Linux Repro](https://github.com/archlinux/archlinux-repro) - Tool for reproducing Arch Linux packages using recorded build information and controlled environments.
- [Build Path Prefix Map Specification](https://reproducible-builds.org/specs/build-path-prefix-map/) - Specification for communicating build-path remapping to compilers and build tools.
- [Changing Debian Language](https://wiki.debian.org/ChangeLanguage) - Debian wiki guidance for selecting language, locale, keyboard, and translated interface settings.
- [Configuring Debian Locales](https://packages.debian.org/stable/localization/) - Debian package index for localization, language packs, fonts, input methods, and translation utilities.
- [Debian Bookworm GCC Workaround](https://dev.to/pgradot/just-in-case-debian-bookworm-comes-with-a-buggy-gcc-2e9b) - Troubleshooting note for replacing a problematic GCC package version in Debian Bookworm-based build environments.
- [Debian Dependency Hell](https://wiki.debian.org/DependencyHell) - Debian wiki discussion of dependency conflicts, causes, recovery techniques, and prevention.
- [Debian Docker Image Checksums](https://docker.debian.net/) - Checksums, OCI digests, build inputs, and reproducibility details for official Debian container root filesystems.
- [Debian Environment Variables](https://wiki.debian.org/EnvironmentVariables) - Debian wiki reference for system-wide, session, shell, and application environment-variable configuration.
- [Debian oneTBB Package](https://packages.debian.org/bookworm/libtbb-dev) - Debian package page for the oneTBB development headers, libraries, versions, and architecture downloads.
- [Debian Package Configuration Upgrades](https://serverfault.com/questions/912314/how-dpkg-check-config-files-when-upgrading-packages) - Community explanation of how `dpkg` detects locally modified configuration files during package upgrades.
- [Debian Time Zone Changes](https://wiki.debian.org/TimeZoneChanges) - Debian wiki guidance for setting the system time zone and updating zone-information data.
- [diffoscope](https://diffoscope.org/) - In-depth comparison tool that recursively inspects files, archives, packages, images, and directories to explain binary differences.
- [Distro Tools](https://github.com/resf/distro-tools) - Rocky Enterprise Software Foundation utilities for distribution packaging, repository, signing, and release workflows.
- [Installing cURL on Debian](https://www.cyberciti.biz/faq/howto-install-curl-command-on-debian-linux-using-apt-get/) - Practical guide to installing and verifying the cURL command-line client on Debian systems.
- [Installing New Debian Locales](https://unix.stackexchange.com/questions/669734/how-can-i-install-new-locales-for-debian) - Community guidance for installing locale definitions and generating additional locales on Debian-based systems.
- [Locale Environment Variables](https://www.gnu.org/software/gettext/manual/html_node/Locale-Environment-Variables.html) - GNU gettext manual reference for `LANG`, `LC_ALL`, and category-specific locale variables.
- [MacPorts Ports](https://github.com/macports/macports-ports) - Portfiles and metadata used to build and distribute the MacPorts software catalog.
- [Rebuilderd](https://github.com/kpcyrd/rebuilderd) - Independent verification service that rebuilds packages and compares resulting artifacts for reproducibility.
- [Recording Version Information](https://reproducible-builds.org/docs/version-information/) - Guidance for preserving useful version metadata without making otherwise identical builds differ.
- [repro-sources-list.sh](https://github.com/reproducible-containers/repro-sources-list.sh) - Configures APT and related package sources to use reproducible snapshots.
- [Reproducible Builds](https://reproducible-builds.org/) - Cross-distribution project providing specifications, tooling, research, and guidance for deterministic software builds.
- [Reproducible Builds Community](https://reproducible-builds.org/who/) - Organizations, projects, contributors, and funding partners participating in reproducible-builds work.
- [Reproducible Builds Definition](https://reproducible-builds.org/docs/definition/) - Canonical definition of a reproducible build and the inputs that must be available to recreate identical artifacts.
- [Reproducible Builds Documentation](https://reproducible-builds.org/docs/) - Topic index for deterministic-build techniques covering timestamps, paths, inputs, archives, toolchains, and metadata.
- [Reproducible Builds Projects](https://reproducible-builds.org/who/projects/) - Index of operating systems, distributions, package ecosystems, and other projects participating in reproducible-build work.
- [Reproducible Builds Publications](https://reproducible-builds.org/docs/publications/) - Bibliography of academic and technical publications about reproducible software builds.
- [Reproducible Builds Stable Inputs](https://reproducible-builds.org/docs/stable-inputs/) - Guidance for controlling volatile build inputs such as timestamps, locale, paths, ordering, and environment state.
- [Reproducible Builds Standard Environment Variables](https://wiki.debian.org/ReproducibleBuilds/StandardEnvironmentVariables#Checklist) - Checklist of environment variables considered when standardizing reproducible build environments.
- [Reproducible Builds Tools](https://reproducible-builds.org/tools/) - Catalog of diffing, normalization, rebuilding, and verification tools used to diagnose and improve build reproducibility.
- [Reproducible Builds Website](https://salsa.debian.org/reproducible-builds/reproducible-website) - Source repository for the Reproducible Builds project website and its guidance on deterministic software artifacts.
- [reprotest](https://salsa.debian.org/reproducible-builds/reprotest) - Tool that rebuilds software under varied environments to reveal inputs that make artifacts nondeterministic.
- [SOURCE_DATE_EPOCH](https://reproducible-builds.org/specs/source-date-epoch/) - Specification for supplying a stable timestamp to build systems and generated artifacts.
- [strip-nondeterminism](https://salsa.debian.org/reproducible-builds/strip-nondeterminism) - Post-processing tool that normalizes common nondeterministic metadata in archives and generated artifacts.
- [Troubleshooting Killed cc1plus Builds](https://stackoverflow.com/questions/66967848/g-fatal-error-killed-signal-terminated-program-cc1plus-when-trying-to-install) - Community diagnosis of C++ compiler processes terminated by memory pressure and strategies for reducing parallel build load.
- [Troubleshooting LC_ALL Locale Warnings](https://stackoverflow.com/questions/66859800/bin-bash-warning-setlocale-lc-all-cannot-change-locale-en-us-utf-8) - Community fixes for missing locale definitions that cause Bash setlocale warnings in Linux and container environments.

## Platforms and Storage

- [AlmaLinux](https://almalinux.org/) - Community-owned, enterprise-focused Linux distribution compatible with the Red Hat Enterprise Linux ecosystem.
- [CNCF Landscape](https://landscape.cncf.io/) - Official interactive map of cloud-native projects, products, members, categories, and project maturity across the Cloud Native Computing Foundation ecosystem.
- [Coder](https://coder.com/) - Open-source platform for provisioning governed remote development environments on an organization's own infrastructure, with commercial enterprise features.
- [KubeSphere](https://github.com/kubesphere) - Cloud-native platform and project organization for managing Kubernetes workloads across clusters and environments.
- [LitmusChaos](https://github.com/litmuschaos/litmus) - Cloud-native chaos-engineering platform for defining, scheduling, and observing resilience experiments in Kubernetes environments.
- [MinIO Drivers](https://min.io/docs/minio/linux/developers/minio-drivers.html#minio-drivers) - Official index of SDKs and language drivers for applications using MinIO and S3-compatible storage.
- [MinIO S3 API Compatibility](https://min.io/docs/minio/linux/reference/s3-api-compatibility.html) - Reference for Amazon S3 API operations and behaviors supported by MinIO object storage.
- [MinIO](https://min.io/) - S3-compatible object store for private clouds, Kubernetes, and local infrastructure.
- [OpenDaylight](https://www.opendaylight.org/) - Linux Foundation project providing a modular software-defined networking controller platform.
- [OpenStack](https://www.openstack.org/) - Open-source infrastructure platform for managing compute, storage, and networking resources.
- [Quay on GitHub](https://github.com/quay) - Official organization for Quay container-registry projects including Clair, operators, and tooling.
- [TileDB Container Images](https://hub.docker.com/u/tiledb) - Docker Hub organization publishing TileDB databases, services, and development images.

## Runtimes and Specifications

- [binfmt_misc](https://en.wikipedia.org/wiki/Binfmt_misc) - Overview of the Linux kernel facility for registering interpreters for arbitrary executable formats.
- [BuildKit Multi-Platform Images](https://github.com/moby/buildkit#building-multi-platform-images) - BuildKit documentation for cross-compilation and multi-platform image construction.
- [Bytecode Alliance](https://bytecodealliance.org/) - Nonprofit open-source organization building secure WebAssembly runtimes, components, and standards.
- [Compose Build Specification](https://github.com/compose-spec/compose-spec/blob/main/build.md#illustrative-sample) - Compose specification chapter defining build contexts, Dockerfiles, arguments, tags, cache controls, and attestations.
- [Compose Services Specification](https://github.com/compose-spec/compose-spec/blob/main/05-services.md) - Compose specification chapter defining service configuration, lifecycle, networking, storage, dependencies, and runtime behavior.
- [Compose Specification](https://github.com/compose-spec/compose-spec) - Open specification defining platform-agnostic multi-container application models.
- [Compose Specification Schema](https://github.com/compose-spec/compose-spec/blob/main/schema/compose-spec.json) - Canonical JSON Schema for validating Compose application models.
- [containerd](https://containerd.io/) - Industry-standard container runtime focused on simplicity, robustness, and portability.
- [Docker Alternative Runtimes](https://docs.docker.com/engine/daemon/alternative-runtimes/) - Guide to registering and selecting alternative OCI runtimes such as containerd shims, Kata Containers, and GPU runtimes.
- [gosu](https://github.com/tianon/gosu) - Minimal privilege-dropping utility commonly used by container entrypoints to run processes as another user.
- [gVisor](https://gvisor.dev/) - Application-kernel sandbox that adds a userspace isolation boundary between containers and the host.
- [gVisor Source](https://github.com/google/gvisor) - Source repository for the gVisor application kernel and sandboxed container runtime.
- [imgcrypt](https://github.com/containerd/imgcrypt) - Containerd extension for encrypting and decrypting Open Container Initiative image layers.
- [Kata Containers](https://katacontainers.io/) - Secure container runtime that combines lightweight virtual machines with a container workflow.
- [Label Schema Convention](http://label-schema.org/rc1/) - Deprecated container-image label convention preserved as the predecessor to OCI image annotations.
- [nerdctl](https://github.com/containerd/nerdctl) - Docker-compatible command-line interface for containerd with Compose, rootless, lazy-pulling, and image-encryption support.
- [nerdctl Platform Pull Discussion](https://github.com/containerd/nerdctl/pull/1184) - Upstream pull-request discussion about platform selection behavior in the containerd-compatible CLI.
- [OCI Content Digests](https://github.com/opencontainers/.github/blob/main/docs/docs/introduction/digests.md) - Open Container Initiative introduction to content-addressable digests and integrity verification.
- [OCI Image Annotations](https://specs.opencontainers.org/image-spec/annotations/) - Open Container Initiative keys and conventions for attaching metadata to images, manifests, and indexes.
- [OCI Image Configuration](https://github.com/opencontainers/image-spec/blob/main/config.md) - Open Container Initiative specification for image configuration, runtime execution parameters, and filesystem changes.
- [OCI Image Index](https://github.com/opencontainers/image-spec/blob/main/image-index.md) - Specification for image indexes and manifest lists that reference platform-specific OCI manifests.
- [OCI Image Layout](https://github.com/opencontainers/image-spec/blob/main/image-layout.md) - Specification for storing OCI image content and metadata in a filesystem layout.
- [OCI Image Specification](https://github.com/opencontainers/image-spec) - Open Container Initiative specification for image manifests, indexes, configurations, filesystems, layouts, and annotations.
- [OCI Runtime Implementations](https://github.com/opencontainers/runtime-spec/blob/main/implementations.md) - Catalog of implementations of the Open Container Initiative runtime specification.
- [OpenContainers](https://github.com/opencontainers) - GitHub organization for the Open Container Initiative specifications, tooling, and reference implementations.
- [regclient](https://github.com/regclient/regclient) - Command-line tools and Go libraries for inspecting, copying, and modifying OCI images and registries.
- [Sidero bldr](https://github.com/siderolabs/bldr) - Containerized build toolchain used by Sidero Labs for reproducible Linux artifacts.
- [tonistiigi/binfmt](https://github.com/tonistiigi/binfmt) - Cross-platform emulator collection distributed as Docker images for BuildKit and other container workflows.
- [Trow](https://trow.io/) - Container registry and image-management project designed to run within Kubernetes clusters.
- [Wasmtime](https://wasmtime.dev/) - Fast, secure WebAssembly runtime built by the Bytecode Alliance.
- [youki](https://github.com/containers/youki) - Open Container Initiative runtime written in Rust with a focus on memory safety and container isolation.

Suggestions and improvements are welcome. See the [contribution guidelines](../../contributing.md).

[← Return to the complete collection](../../README.md)
