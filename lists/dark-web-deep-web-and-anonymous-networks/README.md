<!--lint disable table-pipe-alignment-->

# Awesome Dark Web, Deep Web, and Anonymous Networks [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> A safety-first collection for understanding non-indexed services, anonymous networks, protected publishing, ethical measurement, defensive threat intelligence, and responsible harm reporting.

Part of [akashic](../../README.md), the Ego Hygiene knowledge collection.

<!-- site-guide:start -->

> [!CAUTION]
> Privacy technology does not guarantee anonymity, safety, or legality. Accounts, device compromise, browser changes, downloaded files, document metadata, payments, personal behavior, workplace or school networks, and local law can all expose a person. Use only systems and networks you own or are authorized to use, and follow applicable law and policy.

> [!WARNING]
> Dark-web research can expose people to fraud, malware, violent or exploitative material, and illegal content. This collection intentionally excludes illicit marketplaces, stolen-data access, credential dumps, exploitation material, and instructions for abuse. Do not download, preserve, or redistribute harmful material merely to document it; use the appropriate reporting channel below.

## Contents

- [Orient First](#orient-first)
- [Orientation and Safer Use](#orientation-and-safer-use)
- [Tor Browser, Access, and Circumvention](#tor-browser-access-and-circumvention)
- [Onion Services and Infrastructure](#onion-services-and-infrastructure)
- [Source Protection and Safer Files](#source-protection-and-safer-files)
- [Anonymous and Privacy-Preserving Networks](#anonymous-and-privacy-preserving-networks)
- [Research, Measurement, and Ethics](#research-measurement-and-ethics)
- [Verified Public-Interest Onion Discovery](#verified-public-interest-onion-discovery)
- [Threat Research and Public Reports](#threat-research-and-public-reports)
- [Defensive Exposure and Threat Intelligence](#defensive-exposure-and-threat-intelligence)
- [Reporting Harm and Cybercrime](#reporting-harm-and-cybercrime)
- [Related Akashic Collections](#related-akashic-collections)

## Orient First

These terms describe different things and should not be treated as synonyms.

| Term | Practical meaning | Common examples |
| --- | --- | --- |
| Surface web | Public pages that ordinary search engines can discover and index. | News sites, public documentation, and open directories. |
| Deep web | Content not indexed or not publicly reachable, often because it sits behind a login, paywall, form, or database query. | Email, patient portals, subscription archives, and private cloud files. |
| Dark web | Services intentionally reachable through a specialized overlay or anonymity network; it is often treated as a small subset of the deep web. | Tor onion services and I2P sites. |
| Anonymous overlay | A network designed to separate identity or location from communication, with properties and limits that vary by system. | Tor, I2P, Hyphanet, GNUnet, and Lokinet. |

### Choose the path that matches the need

| Need | Start with | Important boundary |
| --- | --- | --- |
| Understand the topic | Orientation and public research reports. | Sensational claims and raw marketplace counts are often methodologically weak. |
| Browse with stronger privacy | Tor Browser guidance, security levels, and a personal threat model. | Installing a privacy browser does not make every device or activity anonymous. |
| Reach a blocked public resource | Official bridge and circumvention documentation. | Do not bypass controls on a device or network without authorization. |
| Protect a source or submission | SecureDrop, GlobaLeaks, OnionShare, and qualified digital-security support. | Use the recipient's official clear-web page to obtain current submission instructions. |
| Run or study infrastructure | Onion-service, relay, measurement, and research-safety documentation. | Test against systems and traffic you control or have explicit permission to study. |
| Find an official onion service | The operator's canonical clear-web announcement or authenticated Onion-Location header. | Copied directories and search results can be stale, impersonated, or malicious. |
| Investigate organizational exposure | Defensive monitoring platforms and lawful internal procedures. | Monitoring does not remove leaked data and may itself involve highly sensitive information. |
| Report harm | The jurisdiction-appropriate official hotline or reporting portal. | Do not put yourself at risk or collect illegal material; emergency services handle immediate danger. |

### Minimum safer-use checklist

1. Define what you are trying to protect, from whom, and what failure would cost before choosing a tool.
2. Obtain software and onion addresses only from the operator's canonical clear-web site or a cryptographically authenticated source.
3. Keep the browser and operating system current; do not install extra browser extensions or casually change privacy settings.
4. Avoid mixing identities, accounts, documents, downloads, and payment methods across contexts without understanding the linkage risk.
5. Treat files and links as hostile until assessed; metadata and external content can reveal information even after a secure transfer.
6. Stop if a task requires unauthorized access, trading in stolen data, interacting with illegal marketplaces, or retaining exploitative material.
7. For high-risk journalism, activism, abuse survival, or legal exposure, seek qualified digital-security or legal support rather than relying on a list.

This page links to canonical public websites rather than copying `.onion` addresses. That is deliberate: onion addresses are difficult to verify, can change, and are frequent phishing targets.

<!-- site-guide:end -->

## Orientation and Safer Use

- [CISA Dark Web and Cyber Crime](https://www.cisa.gov/stopransomware/dark-web-and-cyber-crime) - Plain-language U.S. government overview of the deep web, dark web, common criminal uses, and organizational risk; it is orientation, not a browsing guide.
- [EFF: How to Use Tor](https://ssd.eff.org/module/how-to-use-tor) - Surveillance Self-Defense walkthrough for obtaining and using Tor Browser, with practical limits and security considerations.
- [Freedom of the Press Foundation Digital Security](https://freedom.press/digisec/) - Training, guides, and support for journalists and newsrooms facing source-protection, account, device, and communication risks.
- [Security in a Box](https://securityinabox.org/en/) - Front Line Defenders and Tactical Tech guides for human-rights defenders developing a realistic digital-security practice.
- [Surveillance Self-Defense](https://ssd.eff.org/) - EFF threat-modeling and privacy guides covering safer communication, devices, data, and anonymity tools.
- [Tor Abuse FAQ](https://support.torproject.org/abuse/) - Tor Project explanations for responding to abuse complaints and understanding what relay operators can and cannot observe.
- [Tor Glossary](https://support.torproject.org/glossary/) - Definitions for Tor, onion services, bridges, relays, circuits, fingerprints, and related concepts.
- [Tor Project Support](https://support.torproject.org/) - Canonical troubleshooting and safety documentation for Tor Browser, onion services, relays, anti-censorship, and mobile use.
- [Totem](https://totem-project.org/) - Free digital-security learning platform created for journalists, activists, and human-rights defenders, with self-paced courses in multiple languages.

## Tor Browser, Access, and Circumvention

- [Ceno Browser](https://ceno.app/) - Open-source mobile browser that combines ordinary web access with peer-assisted delivery for regions experiencing censorship or connectivity disruption.
- [Mullvad Browser](https://mullvad.net/en/browser) - Privacy-focused browser developed with the Tor Project to reduce tracking and fingerprinting; it does not connect to the Tor network by itself.
- [OONI Explorer](https://explorer.ooni.org/) - Public measurement explorer for examining evidence of internet censorship and network interference around the world.
- [OONI Probe](https://ooni.org/install/) - Open-source measurement application for testing website blocking, messaging-app reachability, and network performance with informed-consent warnings.
- [Orbot](https://orbot.app/) - Guardian Project application that provides Tor connectivity for supported Android and iOS workflows.
- [Psiphon](https://psiphon.ca/) - Open-source circumvention service that uses multiple transport technologies to help users reach an open internet under restrictive network conditions.
- [Snowflake](https://snowflake.torproject.org/) - Tor pluggable transport that routes censored users through short-lived volunteer proxies and explains how people can safely volunteer browser capacity.
- [Tails](https://tails.net/) - Free live operating system that routes internet traffic through Tor and is designed to minimize traces on the host computer.
- [Tor Bridges](https://bridges.torproject.org/) - Official Tor Project distributor for relay addresses that are not listed publicly and may help where direct Tor connections are blocked.
- [Tor Browser](https://www.torproject.org/download/) - Official browser configured to route traffic through Tor and reduce tracking and fingerprinting across sites.
- [Tor Browser Censorship Circumvention](https://support.torproject.org/tor-browser/circumvention/) - Official guidance for connection assistance, bridges, and pluggable transports when Tor is blocked.
- [Tor Browser Managing Identities](https://support.torproject.org/tor-browser/features/managing-identities/) - Explanation of circuits, new identities, new circuits, and the limits of separating browsing activity.
- [Tor Browser Secure Connections](https://support.torproject.org/tor-browser/features/secure-connections/) - Visual explanation of how Tor routing and HTTPS protect different portions of a connection.
- [Tor Browser Security Levels](https://support.torproject.org/tor-browser/features/security-levels/) - Official description of Standard, Safer, and Safest modes and the web features each level disables.
- [Tor Infrastructure Status](https://torprojectstatus.org/) - Current Tor Project service-health dashboard for directory authorities, bridges, websites, and related infrastructure.
- [Whonix](https://www.whonix.org/) - Security-focused operating system that separates a Tor gateway from a workstation in virtual machines; safe use still depends on host and behavior.

## Onion Services and Infrastructure

- [Arti](https://arti.torproject.org/) - Tor Project's Rust implementation of the Tor protocols, intended as a modular foundation for applications and future Tor clients.
- [Enterprise Onion Toolkit](https://github.com/alecmuffett/eotk) - Open-source configuration toolkit for experienced operators deploying load-balanced onion services for existing websites.
- [Nyx](https://nyx.torproject.org/) - Command-line monitor for inspecting and managing a locally operated Tor relay or client.
- [Onion Services Ecosystem](https://onionservices.torproject.org/) - Tor Project-maintained catalog of libraries and deployment tools for building, monitoring, and scaling onion services.
- [OnionBalance](https://onionservices.torproject.org/apps/base/onionbalance/) - Tor onion-service load-balancing system for operators who need redundancy across multiple backend instances.
- [Onion-Location](https://community.torproject.org/onion-services/advanced/onion-location/) - Official method for a website to advertise its authenticated onion counterpart through an HTTP response header.
- [Onionprobe](https://onionservices.torproject.org/apps/web/onionprobe/) - Monitoring tool for checking the reachability and certificate behavior of onion services an operator is authorized to assess.
- [Onionspray](https://onionservices.torproject.org/apps/web/onionspray/) - Nginx-based HTTPS termination and reverse-proxy configuration for onion-service deployments.
- [Stem](https://stem.torproject.org/) - Python controller library for applications that inspect or manage a Tor process through its control protocol.
- [Tor Onion Service Setup](https://community.torproject.org/onion-services/setup/) - Official deployment guide for creating a basic onion service and protecting its private key.
- [Tor Onion Services](https://community.torproject.org/onion-services/) - Tor Project overview of onion-service properties, use cases, design, and operational documentation.
- [Tor Relay Operations](https://community.torproject.org/relay/) - Official guidance for choosing, configuring, and responsibly operating Tor relays and bridges.
- [Tor Specifications](https://spec.torproject.org/) - Protocol specifications and design documents for researchers, implementers, and interoperable Tor software.

## Source Protection and Safer Files

- [Cwtch](https://docs.cwtch.im/) - Metadata-resistant, decentralized messaging protocol and application documentation designed around Tor onion services.
- [Dangerzone](https://dangerzone.rocks/) - Open-source tool that converts potentially malicious PDFs, office documents, and images into safer PDFs inside disposable containers.
- [GlobaLeaks](https://globaleaks.org/) - Open-source whistleblowing platform for organizations operating protected submission systems with configurable workflows.
- [GlobaLeaks Documentation](https://docs.globaleaks.org/en/stable/) - Deployment, administration, security, and user documentation for GlobaLeaks operators and recipients.
- [Guardian Project](https://guardianproject.info/) - Open-source mobile-security organization behind privacy, circumvention, media, and communication tools.
- [MAT2](https://0xacab.org/jvoisin/mat2) - Open-source metadata-removal tool for documents and media; removal reduces some disclosure risk but cannot make a file safe by itself.
- [OnionShare](https://onionshare.org/) - Open-source application for sharing files, receiving submissions, hosting a temporary site, or chatting through Tor without a centralized account.
- [OnionShare Documentation](https://docs.onionshare.org/) - Official setup, usage, security, and troubleshooting guidance for OnionShare modes and threat considerations.
- [Ricochet Refresh](https://www.ricochetrefresh.net/) - Peer-to-peer messaging application that uses Tor onion services so users can communicate without a central contact directory.
- [SecureDrop](https://securedrop.org/) - Open-source whistleblower submission system maintained by Freedom of the Press Foundation for news organizations and public-interest groups.
- [SecureDrop Directory](https://securedrop.org/directory/) - Maintainer-reviewed directory of SecureDrop instances with links to each organization's own instructions and onion address.
- [SecureDrop Documentation](https://docs.securedrop.org/en/stable/) - Official installation, administration, journalist, and source guidance for SecureDrop deployments.
- [SecureDrop Workstation](https://workstation.securedrop.org/en/stable/) - Qubes-based workstation documentation for authorized journalists reviewing SecureDrop submissions with stronger isolation.

## Anonymous and Privacy-Preserving Networks

- [Freenet](https://freenet.org/) - Peer-to-peer application platform for decentralized communication and data, distinct from the older project now called Hyphanet.
- [GNUnet](https://www.gnunet.org/en/) - GNU framework for secure decentralized networking research and applications, including peer discovery, naming, and privacy-preserving protocols.
- [GNUnet Documentation](https://docs.gnunet.org/latest/) - Architecture, installation, subsystem, API, and developer documentation for the GNUnet framework.
- [Hyphanet](https://www.hyphanet.org/) - Decentralized, censorship-resistant data-sharing network formerly known as Freenet, with persistent and friend-to-friend modes.
- [I2P](https://i2p.net/en/) - Distributed anonymity network for applications and services that communicate through unidirectional encrypted tunnels.
- [I2P Documentation](https://i2p.net/en/docs/) - Official technical, application, protocol, configuration, and development documentation for I2P.
- [I2P Network Comparison](https://i2p.net/en/docs/overview/comparison/) - I2P project's comparison of its design goals and tradeoffs with Tor and other anonymity systems.
- [Lokinet](https://lokinet.org/) - Onion-routing network built around service nodes and private addresses for applications and websites.
- [Nym Documentation](https://nym.com/docs) - Technical and user documentation for Nym's mixnet-based privacy infrastructure and commercial VPN application.
- [NymVPN](https://nym.com/) - Commercial VPN service using Nym's decentralized mixnet and WireGuard modes; availability, latency, pricing, and privacy properties depend on the selected mode.
- [RetroShare](https://retroshare.cc/) - Decentralized communication and file-sharing suite for authenticated friend-to-friend networks with forums, channels, chat, and mail.
- [Session](https://getsession.org/) - Private messenger using decentralized routing and account identifiers that do not require a phone number or email address.
- [Tribler](https://tribler.org/) - Open-source peer-to-peer research client exploring decentralized search, content sharing, and onion-style routing without a central tracker.
- [Veilid](https://veilid.com/) - Open-source peer-to-peer application framework designed for private, decentralized services without a central server.

## Research, Measurement, and Ethics

- [Association of Internet Researchers Ethics](https://aoir.org/ethics/) - Living ethics guidance for internet research, including contextual decision-making about consent, vulnerability, data, and publication.
- [Cambridge Cybercrime Centre Datasets](https://www.cambridgecybercrime.uk/datasets.html) - Controlled-access cybercrime research datasets and application procedures intended for ethically approved academic work.
- [Chutney](https://gitlab.torproject.org/tpo/core/chutney) - Tor Project test-network harness for running local relay networks without experimenting on public users.
- [CollecTor](https://collector.torproject.org/) - Tor Project archive of relay descriptors and other public network data for reproducible measurement and historical research.
- [ExoneraTor](https://metrics.torproject.org/exonerator.html) - Tor Metrics service for checking whether a public IP address was listed as a Tor relay on a particular date.
- [IMPACT Cyber Trust](https://www.impactcybertrust.org/) - Controlled-access repository and governance program for sharing cybersecurity data with vetted researchers.
- [Menlo Report](https://www.dhs.gov/sites/default/files/publications/CSD-MenloPrinciplesCORE-20120803_1.pdf) - Foundational ethics framework applying respect for persons, beneficence, justice, and respect for law and public interest to information-and-communications research.
- [Privacy Enhancing Technologies Symposium](https://petsymposium.org/) - Peer-reviewed research venue and proceedings for privacy, anonymity, censorship resistance, and related technologies.
- [Selected Papers in Anonymity](https://www.freehaven.net/anonbib/) - Long-running bibliography of technical research on anonymity, pseudonymity, traffic analysis, and censorship resistance.
- [Shadow](https://shadow.github.io/) - Discrete-event network simulator for safely running large-scale Tor and distributed-system experiments away from the public network.
- [TGen](https://github.com/shadow/tgen) - Configurable traffic-generation tool used with Shadow and controlled test environments for network experimentation.
- [Tor Metrics](https://metrics.torproject.org/) - Public dashboards, methods, and downloadable data describing Tor users, relays, bridges, traffic, and performance.
- [TorPS](https://torps.github.io/) - Research simulator for evaluating Tor path-selection algorithms without imposing experiments on the live network.
- [Tor Relay Search](https://metrics.torproject.org/rs.html) - Searchable view of public Tor relay and bridge metadata sourced from Onionoo.
- [Tor Research](https://research.torproject.org/) - Tor Project portal for open research questions, datasets, safety review, events, and collaboration.
- [Tor Research Safety Board](https://research.torproject.org/safetyboard/) - Independent review process and published principles for research that could affect Tor users or the live network.
- [Tor Research Tools](https://research.torproject.org/tools/) - Curated index of test networks, simulators, controllers, datasets, metrics libraries, and relay-analysis tools.
- [Tor Technical Reports](https://research.torproject.org/techreports.html) - Tor Project technical reports documenting measurements, designs, deployment questions, and research findings.

## Verified Public-Interest Onion Discovery

- [Ahmia](https://ahmia.fi/) - Search engine for publicly announced onion services with abuse reporting and filtering; results remain unvetted and can be stale, impersonated, disturbing, or illegal.
- [CIA Onion Site Announcement](https://www.cia.gov/stories/story/cias-latest-layer-an-onion-site/) - Official CIA announcement explaining the agency's onion service and publishing its address from a canonical government domain.
- [Freedom of the Press Onion-Services Tracker](https://freedom.press/issues/onions-side-tracking-tor-availability-reader-privacy-major-news-sites/) - Public tracker and methodology for checking onion-service availability among major news organizations.
- [Guardian Onion Service](https://www.theguardian.com/help/insideguardian/2022/may/30/guardian-launches-tor-onion-service) - Official Guardian announcement and current-address source for its Tor mirror.
- [Mediapart Onion Service](https://blog.torproject.org/mediapart-launches-onion-service/) - Tor Project case study and launch announcement for the French investigative outlet's onion service.
- [ProPublica Onion Service](https://www.propublica.org/nerds/a-more-secure-and-anonymous-propublica-using-tor-hidden-services) - ProPublica engineering announcement describing its onion service and its privacy rationale.
- [Proton on Tor](https://proton.me/tor) - Official Proton page publishing its onion-service address and explaining access and verification considerations.

## Threat Research and Public Reports

- [Behind the Curtain](https://www.rand.org/pubs/research_reports/RR2091.html) - RAND study of the characteristics, scale, and policy implications of the illegal arms trade on dark-web marketplaces.
- [Drugs and the Darknet](https://www.europol.europa.eu/publications-events/publications/drugs-and-darknet-perspectives-for-enforcement-research-and-policy) - Europol and EMCDDA report on darknet drug markets, technology, enforcement, research, and policy.
- [EU Drug Markets: Darknet Markets](https://www.euda.europa.eu/topics/darknet-markets_en) - European Union Drugs Agency topic hub for research and monitoring of drug sales through darknet markets.
- [Europol Internet Organised Crime Threat Assessment](https://www.europol.europa.eu/publications-events/main-reports/iocta-report) - Recurring European law-enforcement assessment of cybercrime developments, criminal services, online abuse, fraud, and illicit marketplaces.
- [FBI Internet Crime Reports](https://www.ic3.gov/AnnualReport/Reports) - Annual statistics and analysis from the Internet Crime Complaint Center covering reported cyber-enabled crime and losses.
- [Internet Firearm Sales](https://www.gao.gov/products/gao-18-24) - U.S. Government Accountability Office report on covert testing and enforcement challenges involving firearm sales on the Surface Web and Dark Web.
- [Internet Freedom Software and Illicit Activity](https://www.rand.org/pubs/research_reports/RR1151.html) - RAND review of how anonymity and circumvention tools support legitimate freedom while also enabling some illicit activity.
- [INTERPOL Cybercrime](https://www.interpol.int/en/Crimes/Cybercrime) - International law-enforcement overview of cybercrime programs, threat areas, operations, partnerships, and capacity building.
- [Law Enforcement Needs for Dark Web Investigations](https://www.rand.org/pubs/research_reports/RR2704.html) - RAND workshop-based assessment of evidence, training, tools, cooperation, and policy needs for criminal investigations involving the dark web.
- [UNODC Global Programme on Cybercrime](https://www.unodc.org/unodc/en/cybercrime/global-programme-cybercrime.html) - United Nations program supporting policy, prevention, criminal-justice response, international cooperation, and research around cybercrime.

## Defensive Exposure and Threat Intelligence

These are commercial, sales-led services. Their presence here is not an endorsement: buyers should independently assess lawful authority, collection methods, retention, access controls, jurisdiction, breach response, and whether monitoring sensitive data creates more risk than it resolves.

- [Flare](https://flare.io/) - Commercial external-threat-exposure platform covering leaked credentials, criminal forums, messaging channels, and other sources for authorized defensive teams.
- [Flashpoint](https://flashpoint.io/why-flashpoint/) - Commercial threat-intelligence platform combining illicit-community research, vulnerability intelligence, fraud data, and analyst support.
- [KELA](https://www.kelacyber.com/platform/) - Commercial cybercrime-intelligence platform for monitoring organizational exposure across criminal sources and prioritizing defensive response.
- [Recorded Future](https://www.recordedfuture.com/platform) - Commercial intelligence platform that correlates open, technical, and restricted-source reporting for security and risk teams.
- [SpyCloud](https://spycloud.com/platform/) - Commercial identity-exposure platform focused on recaptured credentials, malware-derived records, session data, and enterprise remediation workflows.
- [ZeroFox](https://www.zerofox.com/platform/) - Commercial external-cybersecurity platform for digital risk, impersonation, threat intelligence, and disruption services.

## Reporting Harm and Cybercrime

Use the service for its stated jurisdiction and purpose. Do not upload unrelated sensitive data, possess illegal material to prove a report, or assume a web form provides emergency response.

- [CISA Cyber Incident Reporting](https://www.cisa.gov/reporting-cyber-incident) - U.S. guidance and channels for organizations reporting cyber incidents, vulnerabilities, phishing, and malicious activity to the appropriate federal service.
- [Cybertip.ca](https://www.cybertip.ca/en/) - Canada's national tipline for reporting the online sexual exploitation of children and finding prevention and support resources.
- [FBI Electronic Tip Form](https://tips.fbi.gov/) - U.S. federal tip portal for reporting suspected terrorism, violent crime, cybercrime, public corruption, and other FBI matters.
- [INHOPE](https://inhope.org/) - Global network that routes reports of suspected online child sexual abuse material to the appropriate participating national hotline.
- [Internet Watch Foundation Reporting Portal](https://report.iwf.org.uk/) - Reporting portal for suspected online child sexual abuse images or videos, operated for the United Kingdom and international referral pathways.
- [Project Arachnid](https://projectarachnid.ca/en/) - Canadian Centre for Child Protection initiative that detects previously assessed child sexual abuse material and sends removal notices to providers.

## Related Akashic Collections

[Awesome Security](../security/README.md) covers general account defense, privacy, safer connectivity, public-facing safety, the Access Now Digital Security Helpline, the CPJ Safety Kit, breach checks, and defensive exposure monitoring.

[Awesome Abundance: Free and Open-Source Software](../awesome-abundance/free-and-open-source-software/README.md) retains broad security and communication tools such as Qubes OS and Briar that are useful beyond anonymous networks.

[Awesome Research](../research/README.md) covers scholarly databases, repositories, open-access discovery, evidence synthesis, and other legitimate parts of the deep web that require no anonymity network.

[Awesome Legal Help and Law](../legal-help-and-law/README.md) provides legal research, rights information, court resources, qualified legal help, the FBI Internet Crime Complaint Center, and the NCMEC CyberTipline.

[Awesome Public Services and Support](../public-services-and-support/README.md) provides official government and nonprofit support paths, including the FTC fraud-reporting portal, when a person needs help rather than technical infrastructure.

Suggestions and improvements are welcome. See the [contribution guidelines](../../contributing.md).

[← Return to the complete collection](../../README.md)
