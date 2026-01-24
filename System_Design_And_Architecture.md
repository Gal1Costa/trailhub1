## 4. System Design and Architecture

This section describes the system design of TrailHub and explains the main architectural and technology decisions. It first outlines the overall architecture, including the backend structure, API design, frontend approach, and deployment model. It then explains the chosen technologies and the reasons for selecting them, focusing on performance, maintainability, and suitability for the project. Where relevant, alternative approaches are briefly mentioned to highlight key trade-offs.
## 4.1 Architectural Overview and Rationale
## 4.1.1 Architectural Style: Modular Monolith
The platform is designed using a modular monolith architecture, selected for its strong runtime performance, operational simplicity, and lower infrastructure complexity within the current project scope, while still allowing future scalability. Empirical studies comparing monolithic and microservice architectures indicate that monolithic systems often outperform microservices in response time and throughput when deployed on comparable infrastructure, primarily due to the absence of inter-service communication overhead [1]. Furthermore, vertical scaling of monolithic systems has been shown to be cost-efficient and Pareto-optimal for both simple and complex workloads, whereas microservice-based systems may introduce additional complexity and diminishing returns when over-scaled [1].
The implemented modular monolith separates functionality into distinct feature domains such as hikes, users, guides, and reviews. Each domain encapsulates its own routing, business logic, and data access, while executing within a single Node.js process. This structure avoids internal network calls, simplifies deployment, and improves reliability, while preserving clear separation of concerns. Compared to distributed microservice architectures, this approach significantly reduces operational overhead without compromising maintainability. At the same time, clearly defined module boundaries and adapter-based integrations preserve the possibility of extracting selected modules into independent services if future scaling requirements change, making the architecture both efficient and evolvable.
Compared to traditional monolithic designs, the modular monolith improves maintainability and testability by enforcing domain encapsulation and stable interfaces between components. Research shows that this architectural style combines the simplicity and performance benefits of monoliths with many structural advantages commonly associated with microservices, without incurring the high operational overhead of distributed systems [2]. As a result, the selected architecture effectively supports current requirements while preserving long-term flexibility.

## 4.1.2 Backend Architecture and API Design
The backend architecture combines a Controller–Repository pattern with a REST-based API design to achieve clear separation of responsibilities and predictable data flow.
Controllers are responsible for handling HTTP requests, performing request validation, enforcing authentication and authorization checks, and formatting JSON responses. Repositories encapsulate all database interactions and data transformations using Prisma, isolating persistence logic from the web layer. This separation reduces coupling between components and improves maintainability and testability.
Compared to the Model–View–Controller (MVC) pattern, this structure is better suited for an API-oriented backend. Since the backend does not render server-side views and returns JSON responses to a React frontend, a View layer is unnecessary. Additionally, Prisma defines data models at the schema level, reducing the need for a separate Model layer with duplicated persistence logic. The Controller–Repository pattern therefore avoids unnecessary abstraction while maintaining clear responsibilities.
The API layer is implemented using REST. Although both REST and GraphQL are widely used for web APIs, REST was selected due to its simplicity, predictability, and strong performance characteristics in systems with stable data models. REST uses multiple clearly defined endpoints and standard HTTP methods (GET, POST, PUT, DELETE), which simplifies API design, debugging, and security. Experimental evaluations indicate that REST can outperform GraphQL in response time and throughput for monolithic and API-centric systems with predictable access patterns, reporting up to 51% faster responses and 37% higher throughput in tested scenarios [4].
The backend exposes role-based endpoints (e.g., /api/hikes, /api/users, /api/me) with stable schemas and predictable access patterns. REST integrates naturally with Express middleware pipelines for authentication, authorization, and validation, aligning well with the selected backend architecture and supporting long-term maintainability.


## 4.1.3 Frontend Architecture: Single Page Application
The frontend is implemented as a Single Page Application (SPA) using React. React was selected due to its balance between flexibility, performance, and ecosystem maturity. While frameworks such as Svelte and Vue may outperform React in certain benchmarks, React provides stable performance for typical user interactions and benefits from extensive community support and tooling. Compared to Angular, React is lighter and less opinionated, allowing greater freedom in application structure [5].
As an SPA, the frontend performs client-side routing and view rendering, communicating with the backend through REST API calls. This design enables responsive navigation, reduces full page reloads, and shifts UI rendering workload from the server to the client, improving perceived performance and user experience.

## 4.1.4 Deployment Architecture: Docker Containerization
Deployment is fully containerized using Docker to ensure consistency across development and production environments. Docker provides lightweight process isolation and typically incurs less overhead than traditional virtual machines, as it does not require a full guest operating system. Performance studies report that Node.js applications deployed in Docker achieve lower latency and higher throughput than comparable deployments on virtualization platforms such as VirtualBox, due to more efficient resource usage [17].
Environment variables and container configuration are used to separate development and production settings, reducing deployment risk and ensuring that experimental changes do not affect the live system.

## 4.2 Technology Choices
## 4.2.1 Node.js and Express
Node.js with Express.js was selected for the backend due to its efficiency and suitability for API-driven web applications. Node.js uses an event-driven, non-blocking I/O model that supports high concurrency and aligns well with I/O-bound workloads common in web platforms. Compared to frameworks such as Django that follow more synchronous request handling, Node.js can offer strong scalability for lightweight API-centric services and enables a shared language (JavaScript) across both frontend and backend, simplifying development and maintenance [6].
Express.js provides a minimal and flexible framework for building RESTful APIs. It enables clear routing and middleware composition, allowing requests to pass through structured layers such as JSON parsing, authentication, route controllers, and centralized error handling. Compared to more opinionated frameworks, Express offers architectural freedom while remaining widely adopted and well supported in the Node.js ecosystem [7].

## 4.2.2 Prisma and PostgreSQL
Prisma was selected as the ORM because it provides a schema-first and type-safe approach to database access that supports maintainability and reduces runtime errors. By defining models declaratively in schema.prisma, Prisma generates a strongly typed client that improves developer productivity through compile-time checks and autocomplete support. Research indicates that repository-based data access combined with modern ORM approaches improves separation of concerns and long-term maintainability compared to scattered SQL usage or tightly coupled persistence logic [8].
Prisma also simplifies relational querying through an expressive API while supporting automated migration workflows that reduce schema drift across environments. Within this system, Prisma integrates cleanly with the Controller–Repository pattern, where repositories handle persistence operations while controllers remain independent from database details.
PostgreSQL was chosen as the database because the platform relies on relational consistency across interconnected entities such as users, guides, hikes, bookings, and reviews. PostgreSQL enforces relationships through foreign keys and constraints and supports ACID transactions, which are important for operations such as booking creation and capacity checks. PostgreSQL also provides a rich type system and robust constraint enforcement. Compared to MySQL, PostgreSQL offers stronger transactional DDL support and broader capabilities for data-intensive, consistency-critical systems [9].

## 4.2.3 Firebase Authentication
Firebase Authentication was selected because it provides a mature and scalable identity solution with strong ecosystem support. It supports multiple identity providers, secure token issuance, and automatic session handling using JWT-based tokens, making it suitable for production use. Comparative studies highlight Firebase’s maturity and documentation quality relative to Supabase Auth, reducing implementation risk and improving reliability [10]. Integration with the Firebase Admin SDK on the backend enables efficient token verification and supports role-based access control. Compared to Auth0, Firebase also provides a lower-configuration, cost-effective option for the project’s scale.

## 4.2.4 OpenStreetMap and Leaflet
Mapping functionality is implemented using Leaflet with OpenStreetMap tiles. This stack is lightweight, open-source, and effective for interactive maps with markers, polylines, and popups. Leaflet integrates smoothly into React through react-leaflet. Compared to Mapbox GL JS or MapLibre GL JS, Leaflet avoids GPU-focused rendering overhead, authentication tokens, and commercial licensing constraints, reducing complexity and cost. OpenStreetMap provides sufficient coverage and accuracy without dependence on proprietary mapping services, aligning well with functional requirements and sustainability goals [11].

## 4.2.5 React and Vite
Vite was selected as the frontend build tool to improve development speed and production build performance. Compared to Webpack and Create React App (CRA), Vite provides faster startup and near-instant hot reload due to its modern architecture. Since CRA has been deprecated, Vite represents a more future-proof and actively adopted option for React-based development [12][13].

## 4.2.6 DigitalOcean: Spaces and Ubuntu Droplet
DigitalOcean is used for both object storage and hosting. DigitalOcean Spaces is used to store uploaded images and map route data, providing predictable pricing and operational simplicity. Compared to Amazon S3, which includes complex pricing dimensions for requests and data transfer, Spaces offers fixed monthly pricing with included bandwidth and an S3-compatible API, supporting smooth integration with existing tooling.
Server hosting is provided via an Ubuntu-based DigitalOcean Droplet running the deployed application. This setup offers a straightforward VPS model with predictable costs and manageable deployment complexity. While AWS EC2 and S3 provide broader advanced capabilities, DigitalOcean fits the project’s budget and operational needs more closely [14].

## 4.2.7 Cloudflare
Cloudflare is used for DNS management, HTTPS enforcement, and edge security. It can be deployed in front of an existing server to improve traffic protection and performance without introducing additional cloud platform complexity. Compared to full hosting platforms such as Microsoft Azure, Cloudflare focuses specifically on edge services such as CDN, SSL/TLS handling, and DDoS protection, which align with the project’s deployment requirements. Studies note Cloudflare’s extensive global edge presence, supporting effective traffic acceleration and protection for public web services [18].

## 4.2.8 Core Web Technologies: HTML, CSS, and JavaScript
The frontend relies on HTML, CSS, and JavaScript as foundational web technologies supported across modern browsers. HTML defines structure, CSS controls layout and presentation, and JavaScript implements interactive behavior. Frameworks such as React build upon these technologies rather than replacing them, using JavaScript for component logic while leveraging standard web primitives for rendering and styling [15].

## 4.2.9 HTTP Communication: Axios and Fetch
HTTP communication uses both Axios and Fetch based on use case. Axios is the primary HTTP client on the frontend because it simplifies JSON handling, provides consistent error responses, and supports token management through interceptors, enabling Firebase tokens to be attached to outgoing requests without duplicating logic. Fetch is used selectively on the backend for a single external API call where a lightweight native approach is sufficient. This balance reduces dependency overhead while retaining productivity benefits. Interceptors and simplified error handling are commonly cited advantages of Axios compared to Fetch for production use [16].


---

## References

[1] M. Bogner, J. Fritzsch, S. Wagner, and A. Zimmermann, "Performance and Scalability of Monolithic and Microservice Architectures," IEEE Int. Conf. on Software Architecture, 2022. [Online]. Available: https://ieeexplore.ieee.org/abstract/document/9717259

[2] M. Taibi, V. Lenarduzzi, and C. Pahl, "From Monolithic Systems to Microservices: A Decomposition Framework Based on Process Mining," Future Internet, vol. 17, no. 11, p. 496, 2025. [Online]. Available: https://www.mdpi.com/1999-5903/17/11/496

[3] A. Mohamed Ali, "Optimizing Software Architecture Using the Repository Pattern in Decoupling Data Access Logic," 2024. [Online]. Available: https://www.researchgate.net/profile/Azrajabeen-Mohamed-Ali/publication/388176662

[4] A. Rahman et al., "Performance Comparison of REST and GraphQL Web Services," Computers, vol. 10, no. 11, p. 138, 2021. [Online]. Available: https://www.mdpi.com/2073-431X/10/11/138

[5] IEEE, "Comparative Analysis of Modern Frontend Frameworks," 2024. [Online]. Available: https://ieeexplore.ieee.org/abstract/document/10243623

[6] A. Jha, "Node.js vs. Django: A Performance and Scalability Comparison," preprint, 2025. [Online]. Available: https://d197for5662m48.cloudfront.net/documents/publicationstatus/256355/preprint_pdf/f6990ad1813ca8ba2683cb9ee1b01228.pdf

[7] A. A. Al-Shaikh et al., "Comparative Study of Node.js Web Frameworks," INCOP Journal, 2023. [Online]. Available: https://incop.org/index.php/mo/article/view/1630/1604

[8] J. Górski et al., "Modern Approaches to Database Access Layer Design in Web Applications," Journal of Computer Sciences Institute, 2023. [Online]. Available: https://ph.pollub.pl/index.php/jcsi/article/view/7951/5289

[9] P. Pławiak and K. Chmiel, "Comparison of PostgreSQL and MySQL Database Management Systems," Journal of Computer Sciences Institute, 2021. [Online]. Available: https://ph.pollub.pl/index.php/jcsi/article/view/2314

[10] A. Amanuel, "Comparing Supabase and Firebase for Application Development," Bachelor's Thesis, Haaga-Helia University of Applied Sciences, 2022. [Online]. Available: https://www.theseus.fi/bitstream/handle/10024/771009/Ayezabu_Amanuel.pdf

[11] MDPI, "Comparative Analysis of Web Mapping Technologies," ISPRS International Journal of Geo-Information, vol. 14, no. 9, p. 336, 2025. [Online]. Available: https://www.mdpi.com/2220-9964/14/9/336

[12] Haaga-Helia University of Applied Sciences, "Modern Build Tools for Web Development," Theseus, 2024. [Online]. Available: https://www.theseus.fi/handle/10024/860241

[13] Haaga-Helia University of Applied Sciences, "Vite vs Webpack: A Performance Comparison," Theseus, 2024. [Online]. Available: https://www.theseus.fi/handle/10024/877513

[14] DigitalOcean, "Amazon S3 vs DigitalOcean Spaces," DigitalOcean Resources, 2025. [Online]. Available: https://www.digitalocean.com/resources/articles/amazon-s3-vs-digitalocean-spaces

[15] T. Duong and Y. Wang, "Modern Front-End Web Development," Bachelor's Thesis, JAMK University of Applied Sciences, 2021. [Online]. Available: https://www.theseus.fi/bitstream/handle/10024/342325/Thesis-Duong-Wang.pdf

[16] F. Kelhini, "Axios vs. Fetch (2025 update): Which should you use for HTTP requests?," LogRocket Blog, Apr. 1, 2025. [Online]. Available: https://blog.logrocket.com/axios-vs-fetch-2025/

[17] A. R. Saputra et al., "Performance Comparison of Node.js Application Deployment Using Docker and VirtualBox," Journal of Informatics and Vocational Education, vol. 5, no. 4, 2022. [Online]. Available: https://joiv.org/index.php/joiv/article/view/1762/793

[18] M. Brown et al., "Domain Fronting Through Microsoft Azure and Cloudflare: How to Identify Viable Domain Fronting Proxies," 2023. [Online]. Available: https://www.researchgate.net/profile/Michael-Brown-121/publication/373191698
