import { Command } from "commander";
import chalk from "chalk";
import shell from "shelljs";
import inquirer from "inquirer";
import fs from "fs-extra";
import path from "path";

const program = new Command();

interface ProjectOptions {
  framework: "springboot" | "nestjs";
  database: "mysql" | "mongodb";
}

// Function to update Spring Boot `pom.xml` with database dependency
const updateSpringBootPom = (projectPath: string, database: string) => {
  const pomPath = path.join(projectPath, "pom.xml");
  if (!fs.existsSync(pomPath)) return;

  const dbDependencies = {
    mysql: `
    <dependency>
      <groupId>mysql</groupId>
      <artifactId>mysql-connector-java</artifactId>
      <scope>runtime</scope>
    </dependency>`,
    mongodb: `
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-mongodb</artifactId>
    </dependency>`,
  };

  let pomContent = fs.readFileSync(pomPath, "utf8");
  pomContent = pomContent.replace(
    "</dependencies>",
    dbDependencies[database] + "\n</dependencies>",
  );
  fs.writeFileSync(pomPath, pomContent, "utf8");
};

// Function to update `application.yml`
const updateSpringBootConfig = (projectPath: string, database: string) => {
  const configPath = path.join(
    projectPath,
    "src/main/resources/application.yml",
  );
  const dbConfigs = {
    mysql: `
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: root
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true`,
    mongodb: `
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/mydb`,
  };

  fs.writeFileSync(configPath, dbConfigs[database], "utf8");
};

// Function to update NestJS config with database
const updateNestJsConfig = (projectPath: string, database: string) => {
  const configPath = path.join(projectPath, "src/app.module.ts");
  const dbConfigs = {
    mysql: `
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'mydb',
      autoLoadEntities: true,
      synchronize: true,
    }),
  ],
})`,
    mongodb: `
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/mydb'),
  ],
})`,
  };

  fs.appendFileSync(configPath, dbConfigs[database], "utf8");
};

// Main CLI action
const createProject = async () => {
  // Step 1: Choose Framework
  const { framework }: { framework: ProjectOptions["framework"] } =
    await inquirer.prompt([
      {
        type: "list",
        name: "framework",
        message: "Select the framework:",
        choices: ["springboot", "nestjs"],
      },
    ]);

  // Step 2: Choose Database
  const { database }: { database: ProjectOptions["database"] } =
    await inquirer.prompt([
      {
        type: "list",
        name: "database",
        message: "Select the database:",
        choices: ["mysql", "mongodb"],
      },
    ]);

  console.log(
    chalk.green(`Setting up ${framework} project with ${database}...`),
  );

  let projectPath = "";

  // Step 3: Generate Project
  if (framework === "springboot") {
    shell.exec("curl https://start.spring.io/starter.zip -o spring-boot.zip");
    shell.exec(
      "unzip spring-boot.zip -d spring-boot-project && rm spring-boot.zip",
    );
    projectPath = path.join(process.cwd(), "spring-boot-project");

    // Step 4: Update Configuration
    updateSpringBootPom(projectPath, database);
    updateSpringBootConfig(projectPath, database);
  } else if (framework === "nestjs") {
    shell.exec("npx @nestjs/cli new nestjs-project");
    projectPath = path.join(process.cwd(), "nestjs-project");

    shell.cd(projectPath);

    if (database === "mysql") {
      shell.exec("npm install @nestjs/typeorm typeorm mysql2");
    } else if (database === "mongodb") {
      shell.exec("npm install @nestjs/mongoose mongoose");
    }

    // Step 4: Update Configuration
    updateNestJsConfig(projectPath, database);
  }

  console.log(chalk.green("Project setup complete!"));
};

program
  .version("1.0.0")
  .description(
    "CLI to generate Spring Boot or NestJS projects with database setup",
  );

program.action(createProject);

program.parse(process.argv);
