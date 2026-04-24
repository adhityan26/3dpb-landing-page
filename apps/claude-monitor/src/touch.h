#pragma once
#include <Arduino.h>

// Inisialisasi HSPI + XPT2046
void touchInit();

// Returns true jika ada tap baru (debounced, tidak fire ulang selama jari masih di layar)
bool touchTapped();
