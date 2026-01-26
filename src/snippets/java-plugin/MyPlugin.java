// Replace 'com.example' with your actual package namespace (e.g., com.yourcompany or io.github.yourusername)
package com.example.myplugin;

import javax.annotation.Nonnull;

import com.hypixel.hytale.logger.HytaleLogger;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

public class MyPlugin extends JavaPlugin {

    private static final HytaleLogger LOGGER = HytaleLogger.forEnclosingClass();

    public MyPlugin(@Nonnull JavaPluginInit init) {
        super(init);
        LOGGER.atInfo().log("Hello from " + this.getName() + " v" + this.getManifest().getVersion());
    }

    @Override
    protected void setup() {
        LOGGER.atInfo().log(this.getName() + " is ready!");
    }
}
