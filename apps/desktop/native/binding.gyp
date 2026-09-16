{
  "targets": [
    {
      "target_name": "desktop_native",
      "sources": [
        "src/binding.cpp",
        "src/sync_root.cpp",
        "src/placeholders.cpp",
        "src/fetch_data.cpp",
        "src/fetch_bridge.cpp",
        "src/local_changes.cpp"
      ],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "defines": ["NAPI_VERSION=8"],
      "conditions": [
        [
          "OS=='win'",
          {
            "msvs_settings": {
              "VCCLCompilerTool": {
                "AdditionalOptions": ["/std:c++20", "/EHsc"]
              }
            },
            "libraries": ["cldapi.lib", "windowsapp.lib", "winhttp.lib"]
          }
        ]
      ]
    }
  ]
}
