using Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Infrastructure.Data
{
    public class StoreContextSeed
    {
        public static async Task SeedAsync(StoreContext context)
        {
            if(!context.Products.Any())
            {
                var productSeed = await File.ReadAllTextAsync("../Infrastructure/Data/SeedData/products.json");

                var products = JsonSerializer.Deserialize<List<Product>>(productSeed);

                if (products == null) return;

                context.Products.AddRange(products);

                await context.SaveChangesAsync();
            }

            if (!context.DeliveryMethods.Any())
            {
                var dmData = await File.ReadAllTextAsync("../Infrastructure/Data/SeedData/delivery.json");

                var methods = JsonSerializer.Deserialize<List<DeliveryMethod>>(dmData);

                if (methods == null) return;

                context.DeliveryMethods.AddRange(methods);

                await context.SaveChangesAsync();
            }
        }
    }
}
