<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Jefe de Área (Admin)',
            'email' => 'admin@gob.com',
            'password' => bcrypt('password'),
            'role' => 'administrador', // <-- ADMIN
        ]);

        User::factory()->create([
            'name' => 'Fabian',
            'email' => 'fabian@gmail.com',
            'password' => bcrypt('password'),
            'role' => 'notificador', // <-- NOTIFICADOR
        ]);
    }
}
