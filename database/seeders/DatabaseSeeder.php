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
        User::firstOrCreate(
            ['email' => 'admin@gob.com'],
            [
                'name' => 'Jefe de Área (Admin)',
                'password' => bcrypt('password'),
                'role' => 'administrador',
            ]
        );

        User::firstOrCreate(
            ['email' => 'fabian@gmail.com'],
            [
                'name' => 'Fabian',
                'password' => bcrypt('password'),
                'role' => 'notificador',
            ]
        );
    }
}
