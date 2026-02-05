plugins {
    java
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

// Configuration for the Vineflower decompiler dependency.
val vineflower by configurations.creating {
    isCanBeResolved = true
    isCanBeConsumed = false
}

repositories {
    mavenCentral()
    maven {
        url = uri("https://maven.hytale.com/release")
    }
}

dependencies {
    val server_version: String by project
    implementation("com.hypixel.hytale:Server:${server_version}")
    vineflower("org.vineflower:vineflower:1.10.1")
}

// Resolve the Hytale install directory. Set the HYTALE_HOME environment
// variable to override the default path.
val hytaleHome = System.getenv("HYTALE_HOME")
    ?: "${System.getProperty("user.home")}/AppData/Roaming/Hytale"

// Updates the manifest.json file with the version from gradle.properties.
tasks.register("updatePluginManifest") {
    val manifestFile = file("src/main/resources/manifest.json")
    doLast {
        if (!manifestFile.exists()) {
            throw GradleException("Could not find manifest.json at ${manifestFile.path}!")
        }
        val slurper = groovy.json.JsonSlurper()
        @Suppress("UNCHECKED_CAST")
        val manifestJson = slurper.parse(manifestFile) as MutableMap<String, Any>
        manifestJson["Version"] = project.version.toString()
        val jsonOutput = groovy.json.JsonOutput.toJson(manifestJson)
        val prettyJson = groovy.json.JsonOutput.prettyPrint(jsonOutput)
        manifestFile.writeText(prettyJson)
        println("Updated manifest.json version to ${project.version}")
    }
}

tasks.named("processResources") {
    dependsOn("updatePluginManifest")
}

tasks.register<JavaExec>("runServer") {
    dependsOn("processResources", "classes")
    mainClass.set("com.hypixel.hytale.Main")
    classpath = sourceSets["main"].runtimeClasspath
    val patchline: String by project
    val runDir = file("run")
    workingDir = runDir
    doFirst {
        runDir.mkdirs()
    }
    args = listOf(
        "--allow-op",
        "--assets=$hytaleHome/install/$patchline/package/game/latest/Assets.zip"
    )
}

// Vineflower decompiler tasks for generating readable source code.
val genSourcesOutputDir = layout.buildDirectory.dir("generated/sources/vineflower")

tasks.register<JavaExec>("genSources") {
    group = "decompilation"
    description = "Decompile the Hytale Server jar using Vineflower."

    mainClass.set("org.jetbrains.java.decompiler.main.decompiler.ConsoleDecompiler")
    classpath = vineflower
    maxHeapSize = "12g"

    val runtimeClasspathConfig = configurations.runtimeClasspath
    dependsOn(runtimeClasspathConfig)

    doFirst {
        val outputDir = genSourcesOutputDir.get().asFile
        val serverJar = runtimeClasspathConfig.get().resolve().firstOrNull {
            it.name.startsWith("Server-") && it.extension == "jar"
        } ?: throw GradleException("Could not find Hytale Server jar in runtimeClasspath.")

        outputDir.deleteRecursively()
        outputDir.mkdirs()

        args = listOf(
            "-dgs=1",  // Decompile generic signatures
            "-rsy=1",  // Remove synthetic members
            "-ren=1",  // Rename ambiguous members
            serverJar.absolutePath,
            outputDir.absolutePath
        )
    }

    outputs.dir(genSourcesOutputDir)
}

tasks.register<Jar>("genSourcesJar") {
    group = "decompilation"
    description = "Package decompiled sources into a sources jar."
    dependsOn("genSources")
    from(genSourcesOutputDir)
    archiveClassifier.set("sources")
}
